import {onCall, HttpsError} from "firebase-functions/https";
import {Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {
  DRAFT_STEP_ORDER,
  assertVerifiedSession,
  draftRef,
  laterStep,
} from "./lib/drafts";
import {isValidEmail, normalizeEmail, verificationId} from "./lib/otp";
import {optionalString} from "./signup";

type Fields = Record<string, unknown> | null | undefined;

// Fields each step saves. Nothing is required here: a draft holds the
// form as typed so far, and the final submit is what enforces required
// fields and formats. Mirrors DRAFT_FIELDS in SignupForm.tsx.
const STEP_FIELDS: Record<string, readonly string[]> = {
  personal: [
    "name",
    "dni",
    "age",
    "university",
    "major",
    "gradYear",
    "location",
    "diet",
  ],
  socials: ["github", "linkedin", "x", "instagram", "website"],
  team: ["teamChoice", "teamName", "teamCode"],
};

/**
 * Reads one step's fields as typed so far, trimmed and length-capped.
 * @param {string} step Which step is being saved.
 * @param {Fields} data Raw step fields.
 * @return {Record<string, string>} The trimmed fields.
 */
function parseStep(step: string, data: Fields): Record<string, string> {
  const fields = Object.fromEntries(
    STEP_FIELDS[step].map((key) => [key, optionalString(data?.[key], key)]),
  );
  if (
    step === "team" &&
    fields.teamChoice &&
    fields.teamChoice !== "join" &&
    fields.teamChoice !== "create"
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A valid team choice is required.",
    );
  }
  return fields;
}

export const hackaiolSaveSignupDraft = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  const verificationToken =
    typeof body?.verificationToken === "string" ? body.verificationToken : "";
  const step = typeof body?.step === "string" ? body.step : "";
  if (!Object.keys(STEP_FIELDS).includes(step)) {
    throw new HttpsError("invalid-argument", "A valid step is required.");
  }
  const fields = parseStep(step, body?.data as Fields);

  const verRef = db.collection("emailVerifications").doc(
    verificationId(email),
  );
  const signupRef = db.collection("signups").doc(email);
  const ref = draftRef(email);

  await db.runTransaction(async (tx) => {
    const verSnap = await tx.get(verRef);
    const signupSnap = await tx.get(signupRef);
    const draftSnap = await tx.get(ref);

    assertVerifiedSession(verSnap, verificationToken);
    // A finished sign-up is final: it can't be reopened as a draft.
    if (signupSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "This email is already signed up.",
      );
    }

    const now = Timestamp.now();
    const prev = draftSnap.data();
    const order: readonly string[] = DRAFT_STEP_ORDER;
    const completed = order.includes(step) ? step : null;
    tx.set(ref, {
      email,
      data: {...(prev?.data as Record<string, string> | undefined), ...fields},
      lastCompletedStep: laterStep(
        (prev?.lastCompletedStep as string | null | undefined) ?? null,
        completed,
      ),
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    });
  });

  return {ok: true};
});

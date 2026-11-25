import {HttpsError} from "firebase-functions/https";
import {
  DocumentReference,
  DocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";

import {db} from "../admin";
import {verificationId} from "./otp";

export const SIGNUP_DRAFTS_COLLECTION = "signupDrafts";

// Steps whose completion is recorded on a draft, in form order. The team
// step is the last one and only completes with the sign-up itself, so it
// is saved as a partial draft and never marked as completed.
export const DRAFT_STEP_ORDER = ["personal", "socials"] as const;

export type SignupDraft = {
  lastCompletedStep: string | null;
  data: Record<string, string>;
};

/**
 * Builds the signupDrafts doc reference for an email. Keyed like
 * emailVerifications, so the address itself is never used as a key.
 * @param {string} email The email the draft belongs to.
 * @return {DocumentReference} The draft doc reference.
 */
export function draftRef(email: string): DocumentReference {
  return db.collection(SIGNUP_DRAFTS_COLLECTION).doc(verificationId(email));
}

/**
 * Asserts an emailVerifications doc proves the caller confirmed a code:
 * verified, holding the caller's token, not yet consumed, not expired.
 * @param {DocumentSnapshot} verSnap The emailVerifications snapshot.
 * @param {string} verificationToken The token the caller presented.
 */
export function assertVerifiedSession(
  verSnap: DocumentSnapshot,
  verificationToken: string,
): void {
  const ver = verSnap.data();
  if (
    !ver ||
    !ver.verified ||
    ver.verificationToken !== verificationToken ||
    ver.consumedAt
  ) {
    throw new HttpsError("failed-precondition", "Email not verified.");
  }
  const expiresAt = ver.expiresAt as Timestamp;
  if (Timestamp.now().toMillis() > expiresAt.toMillis()) {
    throw new HttpsError(
      "failed-precondition",
      "Verification expired, request a new code.",
    );
  }
}

/**
 * Loads the in-progress sign-up for an address, if any. Only call this
 * once the caller has proven they own the address: a draft holds personal
 * data, and its mere existence must not leak to someone typing the email.
 * @param {string} email The verified email.
 * @return {Promise<SignupDraft | null>} The draft, or null if none.
 */
export async function loadDraft(email: string): Promise<SignupDraft | null> {
  const draft = (await draftRef(email).get()).data();
  if (!draft) return null;
  return {
    lastCompletedStep:
      (draft.lastCompletedStep as string | null | undefined) ?? null,
    data: (draft.data as Record<string, string> | undefined) ?? {},
  };
}

/**
 * Picks whichever of two steps comes later in the form, so going back
 * and re-saving an earlier step never rewinds the recorded progress.
 * @param {string | null} a One step, or null for none.
 * @param {string | null} b Another step, or null for none.
 * @return {string | null} The later step, or null if neither is known.
 */
export function laterStep(a: string | null, b: string | null): string | null {
  const order: readonly string[] = DRAFT_STEP_ORDER;
  const index = Math.max(order.indexOf(a ?? ""), order.indexOf(b ?? ""));
  return index >= 0 ? order[index] : null;
}

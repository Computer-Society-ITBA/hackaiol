import {onCall, HttpsError} from "firebase-functions/https";
import {
  DocumentReference,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import {db} from "./admin";
import {
  GMAIL_APP_PASSWORD,
  sendSignupConfirmationEmail,
  type ConfirmationTeam,
} from "./lib/email";
import {isValidEmail, normalizeEmail, verificationId} from "./lib/otp";
import {MAX_TEAM_SIZE, teamIdFrom} from "./lib/team";

type TeamChoice = "join" | "create";

// DNI or passport; passports can contain letters.
const ID_RE = /^[a-zA-Z0-9]{5,20}$/;
const AGE_RE = /^\d{1,3}$/;
const GRAD_YEAR_RE = /^\d{4}$/;
const MAX_FIELD_LENGTH = 200;

/**
 * Reads an optional string field, trimmed and length-capped.
 * @param {unknown} value The value to read.
 * @param {string} field Field name used in the error message.
 * @return {string} The trimmed string, or "" when absent.
 */
function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_FIELD_LENGTH) {
    throw new HttpsError("invalid-argument", `${field} is too long.`);
  }
  return trimmed;
}

/**
 * Reads a required string field, trimmed and length-capped.
 * @param {unknown} value The value to read.
 * @param {string} field Field name used in the error message.
 * @return {string} The trimmed, non-empty string.
 */
function requiredString(value: unknown, field: string): string {
  const trimmed = optionalString(value, field);
  if (!trimmed) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return trimmed;
}

/**
 * Checks a non-empty value against a pattern.
 * @param {string} value The already-trimmed value.
 * @param {string} field Field name used in the error message.
 * @param {RegExp} pattern Pattern the value must match.
 * @return {string} The value, unchanged.
 */
function matching(value: string, field: string, pattern: RegExp): string {
  if (value && !pattern.test(value)) {
    throw new HttpsError("invalid-argument", `${field} is not valid.`);
  }
  return value;
}

export const hackaiolSubmitSignup = onCall(
  {secrets: [GMAIL_APP_PASSWORD]},
  async (request) => {
    const body = request.data as Record<string, unknown> | null;
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    const verificationToken = requiredString(
      body?.verificationToken,
      "verificationToken",
    );

    const name = requiredString(body?.name, "name");
    const dni = matching(requiredString(body?.dni, "dni"), "dni", ID_RE);
    const age = matching(requiredString(body?.age, "age"), "age", AGE_RE);
    const university = requiredString(body?.university, "university");
    const major = optionalString(body?.major, "major");
    const gradYear = matching(
      optionalString(body?.gradYear, "gradYear"),
      "gradYear",
      GRAD_YEAR_RE,
    );
    const location = requiredString(body?.location, "location");
    const diet = optionalString(body?.diet, "diet");
    const github = optionalString(body?.github, "github");
    const linkedin = optionalString(body?.linkedin, "linkedin");
    const x = optionalString(body?.x, "x");
    const instagram = optionalString(body?.instagram, "instagram");
    const website = optionalString(body?.website, "website");

    const team = body?.team as Record<string, unknown> | undefined;
    const rawChoice = team?.choice;
    // Participation is team-only: there is no "alone" choice.
    if (rawChoice !== "join" && rawChoice !== "create") {
      throw new HttpsError(
        "invalid-argument",
        "A valid team choice is required.",
      );
    }
    const choice = rawChoice as TeamChoice;

    let teamSlug: string;
    let teamName: string | null = null;
    if (choice === "create") {
      teamName = requiredString(team?.name, "team name");
      teamSlug = teamIdFrom(teamName);
      if (teamSlug.length < 3) {
        throw new HttpsError("invalid-argument", "Team name is too short.");
      }
    } else {
      teamSlug = teamIdFrom(requiredString(team?.code, "team code"));
      if (teamSlug.length < 4) {
        throw new HttpsError("invalid-argument", "Team code is too short.");
      }
    }

    const verRef = db.collection("emailVerifications").doc(
      verificationId(email),
    );
    const signupRef = db.collection("signups").doc(email);
    const teamRef = db.collection("teams").doc(teamSlug);

    await db.runTransaction(async (tx) => {
      const verSnap = await tx.get(verRef);
      const signupSnap = await tx.get(signupRef);
      const teamSnap = await tx.get(teamRef);

      if (!verSnap.exists) {
        throw new HttpsError("failed-precondition", "Email not verified.");
      }
      const ver = verSnap.data()!;
      if (
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
      if (signupSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "This email is already signed up.",
        );
      }

      if (choice === "create" && teamSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "This team code is already taken.",
        );
      }
      if (choice === "join") {
        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "Team not found.");
        }
        const memberCount = (teamSnap.data()!.memberCount as number) ?? 0;
        if (memberCount >= MAX_TEAM_SIZE) {
          throw new HttpsError(
            "resource-exhausted",
            "This team is already full.",
          );
        }
      }

      const now = Timestamp.now();

      if (choice === "create") {
        tx.create(teamRef, {
          id: teamSlug,
          name: teamName,
          memberCount: 1,
          memberEmails: [email],
          createdAt: now,
          updatedAt: now,
        });
      } else {
        tx.update(teamRef, {
          memberCount: FieldValue.increment(1),
          memberEmails: FieldValue.arrayUnion(email),
          updatedAt: now,
        });
      }

      tx.create(signupRef, {
        email,
        name,
        dni,
        age,
        university,
        major,
        gradYear,
        location,
        diet,
        github,
        linkedin,
        x,
        instagram,
        website,
        teamChoice: choice,
        teamId: teamSlug,
        status: "pending",
        createdAt: now,
      });
      tx.update(verRef, {consumedAt: now});
    });

    // Best-effort: the signup itself already succeeded, so a confirmation
    // email failure shouldn't fail the request.
    try {
      const teamInfo = await loadTeamConfirmationInfo(teamRef, teamName);
      await sendSignupConfirmationEmail(email, name, teamInfo);
    } catch (err) {
      logger.error("Failed to send signup confirmation email", {email, err});
    }

    return {ok: true, teamId: teamSlug};
  },
);

/**
 * Builds the team info for the confirmation email, re-reading the team
 * doc so the member count reflects this signup's own join or create.
 * @param {DocumentReference} teamRef The team doc reference.
 * @param {string | null} teamName The team name, already known for
 *   "create".
 * @return {Promise<ConfirmationTeam>} Team info to email.
 */
async function loadTeamConfirmationInfo(
  teamRef: DocumentReference,
  teamName: string | null,
): Promise<ConfirmationTeam> {
  const data = (await teamRef.get()).data();
  return {
    name: (data?.name as string | undefined) ?? teamName ?? "",
    code: teamRef.id,
    memberCount: (data?.memberCount as number | undefined) ?? 1,
  };
}

export const hackaiolLookupTeam = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;
  const slug = teamIdFrom(typeof body?.code === "string" ? body.code : "");
  if (slug.length < 4) {
    return {exists: false, memberCount: 0, isFull: false};
  }
  const snap = await db.collection("teams").doc(slug).get();
  if (!snap.exists) {
    return {exists: false, memberCount: 0, isFull: false};
  }
  const memberCount = (snap.data()!.memberCount as number) ?? 0;
  return {exists: true, memberCount, isFull: memberCount >= MAX_TEAM_SIZE};
});

import {onCall, HttpsError} from "firebase-functions/https";
import {DocumentReference, Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {
  CODE_TTL_MS,
  MAX_REQUESTS_PER_HOUR,
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_S,
  TOKEN_TTL_MS,
  generateCode,
  generateToken,
  hashCode,
  isValidEmail,
  normalizeEmail,
  verificationId,
} from "./lib/otp";
import {GMAIL_APP_PASSWORD, sendVerificationCodeEmail} from "./lib/email";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Validates and normalizes the email field of a request.
 * @param {unknown} data Raw onCall request data.
 * @return {string} The normalized email.
 */
function assertValidEmail(data: unknown): string {
  const body = data as {email?: unknown} | null;
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  return email;
}

/**
 * Atomically checks the resend cooldown and hourly request cap, then
 * reserves the slot by writing the new (unsent) code. Pure Firestore work
 * only, with no I/O side effects, so the transaction can safely retry on
 * contention.
 * @param {DocumentReference} verRef The emailVerifications doc reference.
 * @param {string} email The email being verified.
 * @param {string} codeHash The hashed code to store.
 * @return {Promise<void>} Resolves once the slot is claimed.
 */
async function claimVerificationSlot(
  verRef: DocumentReference,
  email: string,
  codeHash: string,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(verRef);
    const now = Timestamp.now();
    const data = snap.exists ? snap.data()! : null;

    const lastRequestAt = data?.lastRequestAt as Timestamp | undefined;
    if (
      lastRequestAt &&
      now.toMillis() - lastRequestAt.toMillis() < RESEND_COOLDOWN_S * 1000
    ) {
      throw new HttpsError(
        "resource-exhausted",
        "Please wait before requesting another code.",
      );
    }

    const windowStart = (data?.windowStart as Timestamp | undefined) ?? now;
    const windowExpired = now.toMillis() - windowStart.toMillis() > HOUR_MS;
    const requestCount = windowExpired ?
      0 :
      ((data?.requestCount as number | undefined) ?? 0);
    if (requestCount >= MAX_REQUESTS_PER_HOUR) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many code requests. Try again later.",
      );
    }

    tx.set(verRef, {
      email,
      codeHash,
      attempts: 0,
      requestCount: requestCount + 1,
      windowStart: windowExpired ? now : windowStart,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + CODE_TTL_MS),
      lastRequestAt: now,
      verified: false,
      verifiedAt: null,
      verificationToken: null,
      consumedAt: null,
    });
  });
}

export const hackaiolRequestCode = onCall(
  {secrets: [GMAIL_APP_PASSWORD]},
  async (request) => {
    const email = assertValidEmail(request.data);

    const signupSnap = await db.collection("signups").doc(email).get();
    if (signupSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "This email is already signed up.",
      );
    }

    const code = generateCode();
    const verRef = db.collection("emailVerifications").doc(
      verificationId(email),
    );

    await claimVerificationSlot(verRef, email, hashCode(code));

    try {
      await sendVerificationCodeEmail(email, code);
    } catch {
      // Don't leave the user cooldown-locked if delivery failed.
      await verRef.update({lastRequestAt: null});
      throw new HttpsError(
        "internal",
        "Could not send the verification email. Please try again.",
      );
    }

    return {ok: true, cooldownSeconds: RESEND_COOLDOWN_S};
  },
);

export const hackaiolConfirmCode = onCall(async (request) => {
  const email = assertValidEmail(request.data);
  const body = request.data as {code?: unknown};
  const code = typeof body.code === "string" ? body.code : "";
  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "A 6-digit code is required.");
  }

  const verRef = db.collection("emailVerifications").doc(
    verificationId(email),
  );

  const verificationToken = await db.runTransaction(async (tx) => {
    const snap = await tx.get(verRef);
    if (!snap.exists) {
      throw new HttpsError(
        "not-found",
        "No verification in progress for this email.",
      );
    }
    const data = snap.data()!;
    const now = Timestamp.now();
    const expiresAt = data.expiresAt as Timestamp;
    if (now.toMillis() > expiresAt.toMillis()) {
      throw new HttpsError("deadline-exceeded", "This code has expired.");
    }
    const attempts = (data.attempts as number | undefined) ?? 0;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many incorrect attempts.",
      );
    }
    if (data.codeHash !== hashCode(code)) {
      tx.update(verRef, {attempts: attempts + 1});
      throw new HttpsError("invalid-argument", "Incorrect code.");
    }

    const token = generateToken();
    tx.update(verRef, {
      verified: true,
      verifiedAt: now,
      verificationToken: token,
      attempts: 0,
      expiresAt: Timestamp.fromMillis(now.toMillis() + TOKEN_TTL_MS),
    });
    return token;
  });

  return {ok: true, verificationToken};
});

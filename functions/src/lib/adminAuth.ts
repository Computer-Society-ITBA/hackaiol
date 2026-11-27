import {createHash, createHmac, timingSafeEqual} from "crypto";
import {defineSecret} from "firebase-functions/params";

// Same project-level secrets as the quantum-jam-csitba backoffice, so one
// set of credentials opens both. Rotating them means setting them again
// and redeploying both apps' admin functions.
export const ADMIN_USERNAME = defineSecret("QUANTUMJAM_ADMIN_USERNAME");
export const ADMIN_PASSWORD = defineSecret("QUANTUMJAM_ADMIN_PASSWORD");

// How long a backoffice session lasts before signing in again.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const TOKEN_VERSION = "v1";
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const PRINTABLE_ASCII_RE = /^[\x20-\x7E]*$/;

type Secret = ReturnType<typeof defineSecret>;

export type AdminCredentials = {username: string; password: string};

/**
 * Reads a secret's value, treating a missing or unreadable one as unset.
 * @param {Secret} secret The secret to read.
 * @return {string} The value, or "" if it isn't available.
 */
function readSecret(secret: Secret): string {
  try {
    return secret.value();
  } catch {
    return "";
  }
}

/**
 * Reads the configured backoffice credentials.
 * @return {AdminCredentials | null} The credentials, or null if either
 *   secret is missing.
 */
export function configuredCredentials(): AdminCredentials | null {
  const username = readSecret(ADMIN_USERNAME);
  const password = readSecret(ADMIN_PASSWORD);
  return username && password ? {username, password} : null;
}

/**
 * Compares two strings in constant time with respect to their contents.
 * Hashing first gives both sides the same length, which timingSafeEqual
 * requires, without leaking the expected length.
 * @param {string} actual The value the client sent.
 * @param {string} expected The configured value.
 * @return {boolean} Whether they match.
 */
function safeEqual(actual: string, expected: string): boolean {
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

/**
 * Parses an `Authorization: Basic ...` header. The username ends at the
 * first colon, so the password may contain colons.
 * @param {string | undefined} header The raw Authorization header.
 * @return {AdminCredentials | null} The credentials, or null if the
 *   header is missing or malformed.
 */
function parseBasicAuth(header: string | undefined): AdminCredentials | null {
  const [scheme, encoded, ...rest] = (header ?? "").trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "basic" || !encoded || rest.length > 0) {
    return null;
  }
  if (!BASE64_RE.test(encoded) || encoded.length % 4 !== 0) return null;

  const decoded = Buffer.from(encoded, "base64").toString("latin1");
  if (!PRINTABLE_ASCII_RE.test(decoded)) return null;

  const separator = decoded.indexOf(":");
  if (separator < 0) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

/**
 * Checks Basic credentials against the configured ones. Both comparisons
 * always run, so timing doesn't reveal which half was wrong.
 * @param {string | undefined} header The raw Authorization header.
 * @param {AdminCredentials} expected The configured credentials.
 * @return {boolean} Whether the header carries the right credentials.
 */
export function checkBasicAuth(
  header: string | undefined,
  expected: AdminCredentials,
): boolean {
  const sent = parseBasicAuth(header);
  const usernameOk = safeEqual(sent?.username ?? "", expected.username);
  const passwordOk = safeEqual(sent?.password ?? "", expected.password);
  return sent !== null && usernameOk && passwordOk;
}

/**
 * Signs a session expiry. The key is the credentials themselves, so
 * rotating either secret invalidates every session already handed out,
 * and nothing has to be stored server-side.
 * @param {number} expiresAt Expiry, in epoch milliseconds.
 * @param {AdminCredentials} credentials The configured credentials.
 * @return {string} The base64url HMAC.
 */
function sign(expiresAt: number, credentials: AdminCredentials): string {
  return createHmac(
    "sha256",
    `${credentials.username}\n${credentials.password}`,
  )
    .update(`hackaiol-admin:${TOKEN_VERSION}:${expiresAt}`)
    .digest("base64url");
}

/**
 * Issues a session token valid for SESSION_TTL_MS.
 * @param {AdminCredentials} credentials The configured credentials.
 * @return {{token: string, expiresAt: string}} The token and its expiry.
 */
export function issueSession(credentials: AdminCredentials): {
  token: string;
  expiresAt: string;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return {
    token: `${TOKEN_VERSION}.${expiresAt}.${sign(expiresAt, credentials)}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

/**
 * Checks an `Authorization: Bearer ...` session token.
 * @param {string | undefined} header The raw Authorization header.
 * @param {AdminCredentials} credentials The configured credentials.
 * @return {boolean} Whether the token is genuine and not expired.
 */
export function checkSession(
  header: string | undefined,
  credentials: AdminCredentials,
): boolean {
  const [scheme, token, ...rest] = (header ?? "").trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return false;
  }
  const [version, rawExpiry, signature, ...extra] = token.split(".");
  if (version !== TOKEN_VERSION || !signature || extra.length > 0) {
    return false;
  }
  const expiresAt = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }
  return safeEqual(signature, sign(expiresAt, credentials));
}

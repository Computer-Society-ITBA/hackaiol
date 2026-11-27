import type {Request, Response} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError, onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

import {db} from "./admin";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  checkBasicAuth,
  checkSession,
  configuredCredentials,
  issueSession,
} from "./lib/adminAuth";
import {isValidEmail, normalizeEmail} from "./lib/otp";
import {MAX_TEAM_SIZE, teamIdFrom} from "./lib/team";
import {optionalString} from "./signup";

const ROUTE_PREFIX = "/api/admin/";

// Must match SIGNUP_STATUSES in src/lib/adminApi.ts. New sign-ups start as
// "pending" (functions/src/signup.ts).
const SIGNUP_STATUSES = ["pending", "accepted", "rejected"] as const;
type SignupStatus = (typeof SIGNUP_STATUSES)[number];

// Firestore batches and transactions cap at 500 writes.
const MAX_BULK = 450;

// Only these fields leave the function, so a new field written by the
// sign-up flow never reaches the backoffice by accident. Timestamps are
// serialized as ISO 8601 UTC strings.
const SIGNUP_FIELDS = [
  "email", "name", "dni", "age", "university", "major", "gradYear",
  "location", "diet", "github", "linkedin", "x", "instagram", "website",
  "teamChoice", "teamId", "status", "createdAt", "updatedAt",
  "statusUpdatedAt",
] as const;
const TEAM_FIELDS = [
  "name", "memberCount", "memberEmails", "createdAt", "updatedAt",
  "createdBy",
] as const;

type Json = string | number | string[] | null;
type Row = Record<string, Json>;

// Maps an HttpsError code to the HTTP status this onRequest returns.
const HTTP_STATUS: Record<string, number> = {
  "invalid-argument": 400,
  "failed-precondition": 400,
  "not-found": 404,
  "already-exists": 409,
  "resource-exhausted": 409,
};

/**
 * Converts a Firestore value into plain JSON.
 * @param {unknown} value The raw field value.
 * @return {Json} A string, number, list of strings, or null.
 */
function serialize(value: unknown): Json {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return null;
}

/**
 * Reads a collection, keeping only the allowed fields. Unordered on
 * purpose: ordering by an optional field would silently drop documents
 * that lack it. The frontend sorts.
 * @param {string} collection Collection name.
 * @param {string[]} fields Fields to keep.
 * @return {Promise<Row[]>} One row per document, keyed by field name.
 */
async function readRows(
  collection: string,
  fields: readonly string[],
): Promise<Row[]> {
  const snap = await db.collection(collection).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    const row: Row = {id: doc.id};
    for (const field of fields) row[field] = serialize(data[field]);
    return row;
  });
}

/**
 * Reads and validates an email field from a request body.
 * @param {unknown} value The raw value.
 * @return {string} The normalized email.
 */
function requireEmail(value: unknown): string {
  const email = typeof value === "string" ? normalizeEmail(value) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  return email;
}

/**
 * Reads a team doc ID from a request body.
 * @param {unknown} value The raw value.
 * @return {string} The team doc ID.
 */
function requireTeamId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id !== teamIdFrom(id)) {
    throw new HttpsError("invalid-argument", "A valid team is required.");
  }
  return id;
}

/**
 * Reads a new team name and the code (doc ID) it maps to.
 * @param {unknown} value The raw value.
 * @return {{name: string, slug: string}} The trimmed name and its slug.
 */
function requireTeamName(value: unknown): {name: string; slug: string} {
  const name = optionalString(value, "name");
  const slug = teamIdFrom(name);
  if (slug.length < 3) {
    throw new HttpsError("invalid-argument", "Team name is too short.");
  }
  return {name, slug};
}

/**
 * Sets the status of one or more sign-ups. Missing emails are skipped.
 * @param {Record<string, unknown>} body Holds emails and status.
 * @return {Promise<{updated: number}>} How many sign-ups changed.
 */
async function setStatus(
  body: Record<string, unknown>,
): Promise<{updated: number}> {
  const status = body.status as SignupStatus;
  if (!SIGNUP_STATUSES.includes(status)) {
    throw new HttpsError("invalid-argument", "A valid status is required.");
  }
  if (!Array.isArray(body.emails) || body.emails.length === 0) {
    throw new HttpsError("invalid-argument", "At least one email is needed.");
  }
  if (body.emails.length > MAX_BULK) {
    throw new HttpsError("invalid-argument", "Too many emails at once.");
  }
  const emails = [...new Set(body.emails.map(requireEmail))];
  const refs = emails.map((email) => db.collection("signups").doc(email));
  const snaps = await db.getAll(...refs);
  const now = Timestamp.now();
  const batch = db.batch();
  let updated = 0;
  for (const snap of snaps) {
    if (!snap.exists || snap.get("status") === status) continue;
    batch.update(snap.ref, {status, statusUpdatedAt: now, updatedAt: now});
    updated++;
  }
  if (updated > 0) await batch.commit();
  return {updated};
}

/**
 * Moves a participant to another team, to a brand new team, or out of
 * any team. Keeps memberEmails and memberCount on both teams in step.
 * A team left with no members is deleted, freeing its name.
 * @param {Record<string, unknown>} body Holds email, plus either
 *   teamId (a team code, or null for no team) or newTeamName.
 * @return {Promise<object>} The participant's teamId now, or null.
 */
async function moveSignup(
  body: Record<string, unknown>,
): Promise<{teamId: string | null}> {
  const email = requireEmail(body.email);
  const newTeam = body.newTeamName !== undefined ?
    requireTeamName(body.newTeamName) :
    null;
  const targetId = newTeam ?
    newTeam.slug :
    body.teamId === null ? null : requireTeamId(body.teamId);

  const signupRef = db.collection("signups").doc(email);
  const teams = db.collection("teams");

  return db.runTransaction(async (tx) => {
    const signupSnap = await tx.get(signupRef);
    if (!signupSnap.exists) {
      throw new HttpsError("not-found", "Participant not found.");
    }
    const currentId = (signupSnap.get("teamId") as string | null) ?? null;
    const currentRef = currentId ? teams.doc(currentId) : null;
    const targetRef = targetId ? teams.doc(targetId) : null;
    const currentSnap = currentRef ? await tx.get(currentRef) : null;
    const targetSnap = targetRef ? await tx.get(targetRef) : null;

    if (newTeam && targetSnap?.exists) {
      throw new HttpsError("already-exists", "That team name is taken.");
    }
    if (currentId === targetId) return {teamId: currentId};
    if (!newTeam && targetSnap) {
      if (!targetSnap.exists) {
        throw new HttpsError("not-found", "Team not found.");
      }
      const members = (targetSnap.get("memberEmails") as string[]) ?? [];
      if (members.length >= MAX_TEAM_SIZE) {
        throw new HttpsError("resource-exhausted", "That team is full.");
      }
    }

    const now = Timestamp.now();
    if (currentRef && currentSnap?.exists) {
      const remaining = ((currentSnap.get("memberEmails") as string[]) ?? [])
        .filter((member) => member !== email);
      if (remaining.length === 0) {
        tx.delete(currentRef);
      } else {
        tx.update(currentRef, {
          memberEmails: remaining,
          memberCount: remaining.length,
          updatedAt: now,
        });
      }
    }
    if (targetRef && newTeam) {
      tx.create(targetRef, {
        id: targetId,
        name: newTeam.name,
        memberCount: 1,
        memberEmails: [email],
        createdAt: now,
        updatedAt: now,
        createdBy: "admin",
      });
    } else if (targetRef && targetSnap) {
      const members = [
        ...((targetSnap.get("memberEmails") as string[]) ?? []),
        email,
      ];
      tx.update(targetRef, {
        memberEmails: members,
        memberCount: members.length,
        updatedAt: now,
      });
    }
    tx.update(signupRef, {teamId: targetId, updatedAt: now});
    return {teamId: targetId};
  });
}

/**
 * Renames a team's display name. The code (doc ID) stays the same, so
 * invite codes already emailed keep working.
 * @param {Record<string, unknown>} body Holds teamId and name.
 * @return {Promise<{ok: true}>} Resolves once renamed.
 */
async function renameTeam(
  body: Record<string, unknown>,
): Promise<{ok: true}> {
  const teamId = requireTeamId(body.teamId);
  const {name, slug} = requireTeamName(body.name);
  const teamRef = db.collection("teams").doc(teamId);
  const clashRef = db.collection("teams").doc(slug);

  await db.runTransaction(async (tx) => {
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "Team not found.");
    }
    // Another team created with this name would use this code, so the
    // two would be indistinguishable.
    if (slug !== teamId && (await tx.get(clashRef)).exists) {
      throw new HttpsError("already-exists", "That team name is taken.");
    }
    tx.update(teamRef, {name, updatedAt: Timestamp.now()});
  });
  return {ok: true};
}

/**
 * Deletes a team. Its members stay signed up, with no team.
 * @param {Record<string, unknown>} body Holds teamId.
 * @return {Promise<{unassigned: number}>} How many members lost the team.
 */
async function deleteTeam(
  body: Record<string, unknown>,
): Promise<{unassigned: number}> {
  const teamId = requireTeamId(body.teamId);
  const teamRef = db.collection("teams").doc(teamId);
  const membersQuery = db.collection("signups").where("teamId", "==", teamId);

  return db.runTransaction(async (tx) => {
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "Team not found.");
    }
    const members = await tx.get(membersQuery);
    const now = Timestamp.now();
    for (const member of members.docs) {
      tx.update(member.ref, {teamId: null, updatedAt: now});
    }
    tx.delete(teamRef);
    return {unassigned: members.size};
  });
}

const WRITES: Record<
  string,
  (body: Record<string, unknown>) => Promise<unknown>
> = {
  "signups/status": setStatus,
  "signups/team": moveSignup,
  "teams/rename": renameTeam,
  "teams/delete": deleteTeam,
};

/**
 * Sends a JSON error body.
 * @param {Response} res The response to write to.
 * @param {number} status HTTP status code.
 * @param {string} error Short machine-readable error code.
 * @param {string} message Optional human-readable detail.
 */
function sendError(
  res: Response,
  status: number,
  error: string,
  message?: string,
): void {
  res.status(status).json(message ? {error, message} : {error});
}

/**
 * Handles one authenticated backoffice route.
 * @param {Request} req The request.
 * @param {Response} res The response.
 * @param {string} route The path after /api/admin/.
 */
async function handleRoute(
  req: Request,
  res: Response,
  route: string,
): Promise<void> {
  if (req.method === "GET" && route === "data") {
    const [signups, teams] = await Promise.all([
      readRows("signups", SIGNUP_FIELDS),
      readRows("teams", TEAM_FIELDS),
    ]);
    res.status(200).json({
      signups,
      teams,
      maxTeamSize: MAX_TEAM_SIZE,
      fetchedAt: new Date().toISOString(),
    });
    return;
  }
  const write = WRITES[route];
  if (req.method === "POST" && write) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    res.status(200).json(await write(body));
    return;
  }
  sendError(res, 404, "not-found");
}

/**
 * API behind /admin. Every request is authenticated before any Firestore
 * access, whether it arrives through the Hosting rewrite or at the
 * function's own URL. Credentials live only in Secret Manager.
 *
 * POST /api/admin/session        Basic credentials in, session token out
 * GET  /api/admin/data           every sign-up and team
 * POST /api/admin/signups/status {emails, status}
 * POST /api/admin/signups/team   {email, teamId | null} or
 *                                {email, newTeamName}
 * POST /api/admin/teams/rename   {teamId, name}
 * POST /api/admin/teams/delete   {teamId}
 *
 * Every route but /session takes `Authorization: Bearer <token>`.
 */
export const hackaiolAdminApi = onRequest(
  {region: "us-central1", secrets: [ADMIN_USERNAME, ADMIN_PASSWORD]},
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.set("X-Robots-Tag", "noindex");

    const credentials = configuredCredentials();
    if (!credentials) {
      logger.error("Backoffice credentials are not configured");
      sendError(res, 500, "not-configured");
      return;
    }

    if (req.method !== "GET" && req.method !== "POST") {
      res.set("Allow", "GET, POST");
      sendError(res, 405, "method-not-allowed");
      return;
    }
    // Writes must be JSON. A cross-site form cannot send that without a
    // CORS preflight, which this function never approves.
    if (req.method === "POST" && !req.is("application/json")) {
      sendError(res, 415, "unsupported-media-type");
      return;
    }

    const path = req.path.replace(/\/+$/, "");
    const routeName = path.startsWith(ROUTE_PREFIX) ?
      path.slice(ROUTE_PREFIX.length) :
      "";
    const authorization = req.get("authorization");

    if (routeName === "session" && req.method === "POST") {
      if (!checkBasicAuth(authorization, credentials)) {
        sendError(res, 401, "unauthorized");
        return;
      }
      res.status(200).json(issueSession(credentials));
      return;
    }

    if (!checkSession(authorization, credentials)) {
      sendError(res, 401, "unauthorized");
      return;
    }

    try {
      await handleRoute(req, res, routeName);
    } catch (err) {
      if (err instanceof HttpsError && HTTP_STATUS[err.code]) {
        sendError(res, HTTP_STATUS[err.code], err.code, err.message);
        return;
      }
      logger.error("Backoffice request failed", {
        route: routeName,
        method: req.method,
        err,
      });
      sendError(res, 500, "internal");
    }
  },
);

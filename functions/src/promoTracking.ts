import type {Response} from "express";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

import {db} from "./admin";
import {EVENT_PAGE_URL} from "./lib/emailTemplates";

// Open and click tracking for the promo email. Each recipient gets a random
// token at send time (scripts/sendPromo.cjs creates its promoRecipients doc),
// so no email address ever travels in a URL.
//   /api/t/o/<token>  1x1 image in the email: counts an open.
//   /api/t/c/<token>  the sign up button: counts a click, then redirects.
const ROUTE = /^\/api\/t\/([oc])\/([A-Za-z0-9_-]{16,32})$/;

export const PROMO_COLLECTION = "promoRecipients";

const SIGNUP_REDIRECT =
  `${EVENT_PAGE_URL}/signup?utm_source=email&utm_medium=promo`;

// Smallest transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * Adds one open or click to the recipient's doc. Unknown tokens are
 * ignored, so random URLs never create documents.
 * @param {string} token The recipient token.
 * @param {"open" | "click"} kind What happened.
 * @return {Promise<void>} Resolves once recorded or ignored.
 */
async function record(token: string, kind: "open" | "click"): Promise<void> {
  const ref = db.collection(PROMO_COLLECTION).doc(token);
  const now = Timestamp.now();
  const counter = kind === "open" ? "opens" : "clicks";
  const first = kind === "open" ? "firstOpenAt" : "firstClickAt";
  const last = kind === "open" ? "lastOpenAt" : "lastClickAt";
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    tx.update(ref, {
      [counter]: FieldValue.increment(1),
      [last]: now,
      ...(snap.get(first) ? {} : {[first]: now}),
    });
  });
}

/**
 * Answers the request: the pixel for opens, the redirect for clicks.
 * @param {Response} res The response.
 * @param {string} kind "o" or "c".
 */
function respond(res: Response, kind: string): void {
  res.set("Cache-Control", "private, no-store, max-age=0");
  res.set("X-Robots-Tag", "noindex");
  if (kind === "o") {
    res.status(200).type("image/gif").send(PIXEL);
  } else {
    res.redirect(302, SIGNUP_REDIRECT);
  }
}

export const hackaiolPromoTrack = onRequest(
  {region: "us-central1"},
  async (req, res) => {
    const match = ROUTE.exec(req.path);
    if (req.method !== "GET" || !match) {
      // A broken link still lands on the sign up page.
      res.redirect(302, SIGNUP_REDIRECT);
      return;
    }
    const [, kind, token] = match;
    // Tracking must never cost the person the image or the redirect.
    try {
      await record(token, kind === "o" ? "open" : "click");
    } catch (err) {
      logger.error("Promo tracking failed", {kind, err});
    }
    respond(res, kind);
  },
);

import * as fs from "fs";
import * as path from "path";
import nodemailer from "nodemailer";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import {
  CONFIRMATION_SUBJECT,
  FROM_EMAIL,
  LOGOS,
  VERIFICATION_SUBJECT,
  renderSignupConfirmationHtml,
  renderVerificationCodeHtml,
  signupConfirmationText,
  verificationCodeText,
  type ConfirmationTeam,
} from "./emailTemplates";

export type {ConfirmationTeam, Teammate} from "./emailTemplates";

// Same delivery path as quantum-jam-csitba: direct Gmail SMTP from the club
// mailbox, with the project-level app password secret both apps share.
export const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const FROM_NAME = "HackaIOL";

// functions/assets/*, relative to this compiled file at
// functions/lib/lib/email.js. Kept outside src/ since tsc only emits
// compiled .ts output into lib/.
const ASSETS_DIR = path.join(__dirname, "..", "..", "assets");

let transporter: nodemailer.Transporter | null = null;
const logoCache = new Map<string, Buffer>();

/**
 * Lazily builds the Gmail SMTP transport with the app password secret.
 * @return {nodemailer.Transporter} The shared SMTP transport.
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: FROM_EMAIL,
        pass: GMAIL_APP_PASSWORD.value(),
      },
    });
  }
  return transporter;
}

/**
 * Reads a logo from functions/assets, cached for the lifetime of the
 * function instance.
 * @param {string} file File name inside the assets directory.
 * @return {Buffer} The PNG bytes.
 */
function readLogo(file: string): Buffer {
  let buf = logoCache.get(file);
  if (!buf) {
    buf = fs.readFileSync(path.join(ASSETS_DIR, file));
    logoCache.set(file, buf);
  }
  return buf;
}

/**
 * Sends an email via Gmail SMTP with the logos attached inline, or logs
 * it locally under the Functions emulator instead of sending for real.
 * @param {string} to Recipient address.
 * @param {string} subject Email subject line.
 * @param {string} text Plain-text body.
 * @param {string} html HTML body.
 * @return {Promise<void>} Resolves once the SMTP server accepts the send.
 */
async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<void> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    logger.info(`[emulator] Email to ${to}, ${subject}\n${text}`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
      attachments: LOGOS.map(({cid, file}) => ({
        filename: file,
        content: readLogo(file),
        cid,
      })),
    });
  } catch (err) {
    logger.error("Failed to send email", {to, subject, err});
    throw err;
  }
}

/**
 * Sends a verification code to an email.
 * @param {string} email Recipient address.
 * @param {string} code The plaintext code to include in the email.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  await sendEmail(
    email,
    VERIFICATION_SUBJECT,
    verificationCodeText(code),
    renderVerificationCodeHtml(code),
  );
}

/**
 * Sends the post-signup confirmation email.
 * @param {string} email Recipient address.
 * @param {string} name The participant's name, as typed.
 * @param {ConfirmationTeam} team Team info to include.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendSignupConfirmationEmail(
  email: string,
  name: string,
  team: ConfirmationTeam,
): Promise<void> {
  await sendEmail(
    email,
    CONFIRMATION_SUBJECT,
    signupConfirmationText(name, team),
    renderSignupConfirmationHtml(name, team),
  );
}

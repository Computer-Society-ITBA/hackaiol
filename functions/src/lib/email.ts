import * as fs from "fs";
import * as path from "path";
import nodemailer from "nodemailer";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import {MAX_TEAM_SIZE} from "./team";

// Same delivery path as quantum-jam-csitba: direct Gmail SMTP from the club
// mailbox, with the project-level app password secret both apps share.
export const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const FROM_EMAIL = "computersociety@itba.edu.ar";
const FROM_NAME = "HackaIOL";

// TODO: swap for the real event page once the domain is decided.
const EVENT_PAGE_URL = "https://csitba-hackaiol.web.app";

// TODO: fill in the venue once it is confirmed.
const EVENT_DATE = "12 de diciembre";
const EVENT_TIME = "11 a 19 h";
const EVENT_PLACE = "A confirmar";

const INSTAGRAM_URL = "https://www.instagram.com/computer.society.itba/";
const LINKEDIN_URL = "https://www.linkedin.com/company/30092847/";

// functions/assets/*, relative to this compiled file at
// functions/lib/lib/email.js. Kept outside src/ since tsc only emits
// compiled .ts output into lib/.
const ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const LOGOS = [
  {cid: "iol-logo", file: "iol-logo.png", width: 142, height: 40},
  {cid: "cs-logo", file: "cs-logo.png", width: 116, height: 48},
];

// The site's identity: deep purple field, IOL green accent. Built for dark
// rendering, with explicit bgcolor attributes so mail clients that force
// their own theme keep the purple.
const COLOR = {
  bg: "#160934",
  bgGlow: "#353587",
  panel: "#221a5c",
  soft: "#2b2470",
  line: "#3d3585",
  text: "#ffffff",
  textDim: "#c7cedb",
  green: "#00d37f",
  ink: "#072016",
};

const FONT_SANS = "'Barlow',Arial,Helvetica,sans-serif";
const FONT_MONO = "'Courier New',Courier,monospace";

const STYLE = {
  heading:
    "margin:0 0 8px;font-size:24px;font-weight:700;line-height:1.25;" +
    `color:${COLOR.text};`,
  bodyText:
    `margin:0 0 24px;font-size:16px;line-height:1.6;color:${COLOR.textDim};`,
  fine: `margin:0;font-size:13px;line-height:1.6;color:${COLOR.textDim};`,
  sectionLabel:
    "margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.12em;" +
    `text-transform:uppercase;color:${COLOR.green};`,
  card:
    `background:${COLOR.soft};border:1px solid ${COLOR.line};` +
    "border-radius:12px;padding:18px 20px;",
  detailLabel:
    "margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:0.12em;" +
    `text-transform:uppercase;color:${COLOR.green};`,
  detailValue: `margin:0;font-size:17px;font-weight:700;color:${COLOR.text};`,
  code:
    `font-family:${FONT_MONO};font-size:36px;font-weight:700;` +
    `letter-spacing:0.35em;color:${COLOR.green};`,
  teamCode:
    `font-family:${FONT_MONO};font-size:22px;font-weight:700;` +
    `letter-spacing:0.04em;color:${COLOR.green};`,
  button:
    "display:inline-block;padding:14px 28px;border-radius:10px;" +
    `background:${COLOR.green};color:${COLOR.ink};` +
    "font-size:15px;font-weight:700;text-decoration:none;",
  notice: `border-left:3px solid ${COLOR.green};padding:2px 0 2px 16px;`,
  noticeTitle:
    `margin:0 0 6px;font-size:15px;font-weight:700;color:${COLOR.text};`,
  noticeText:
    `margin:0 0 6px;font-size:14px;line-height:1.6;color:${COLOR.textDim};`,
  footerText:
    "margin:0 0 10px;font-size:12px;line-height:1.6;" +
    `color:${COLOR.textDim};`,
  footerLink: `color:${COLOR.textDim};text-decoration:underline;`,
};

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
 * Escapes text so it's safe to inline into the HTML email body, since
 * names and team names are free-form user input.
 * @param {string} value Raw text.
 * @return {string} HTML-escaped text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders the footer shared by every email: one-line blurb, social and
 * contact links, and copyright.
 * @return {string} Footer HTML.
 */
function renderFooter(): string {
  return `
    <p style="${STYLE.footerText}">
      HackaIOL es una hackathon de Computer Society ITBA junto a IOL
      Inversiones.
    </p>
    <p style="${STYLE.footerText}">
      <a href="${INSTAGRAM_URL}" style="${STYLE.footerLink}">Instagram</a>
      &nbsp;&nbsp;&nbsp;
      <a href="${LINKEDIN_URL}" style="${STYLE.footerLink}">LinkedIn</a>
      &nbsp;&nbsp;&nbsp;
      <a href="mailto:${FROM_EMAIL}" style="${STYLE.footerLink}">
        ${FROM_EMAIL}
      </a>
    </p>
    <p style="${STYLE.footerText}">&copy; 2026 Computer Society ITBA</p>
  `;
}

/**
 * Wraps email body HTML in the shared shell: logo row, panel with the
 * HackaIOL wordmark, and the footer.
 * @param {string} bodyHtml Inner content HTML.
 * @return {string} The full HTML document.
 */
function renderEmailShell(bodyHtml: string): string {
  const [iol, cs] = LOGOS;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,700;0,800;1,800&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;padding:0;background:${COLOR.bg};"
    bgcolor="${COLOR.bg}">
    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0" bgcolor="${COLOR.bg}"
      style="background-color:${COLOR.bg};background-image:radial-gradient(
        ellipse at 50% 15%,${COLOR.bgGlow} 0%,${COLOR.bg} 65%);">
      <tr>
        <td align="center" style="padding:36px 16px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0"
            border="0"
            style="width:100%;max-width:560px;font-family:${FONT_SANS};">
            <tr>
              <td style="padding:0 4px 24px;">
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0">
                  <tr>
                    <td align="left" valign="middle">
                      <img src="cid:${iol.cid}" width="${iol.width}"
                        height="${iol.height}" alt="IOL Inversiones"
                        style="display:block;border:0;">
                    </td>
                    <td align="right" valign="middle">
                      <img src="cid:${cs.cid}" width="${cs.width}"
                        height="${cs.height}"
                        alt="IEEE Computer Society ITBA"
                        style="display:inline-block;border:0;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLOR.panel}"
                style="background-color:${COLOR.panel};padding:36px 32px;
                  border:1px solid ${COLOR.line};border-radius:16px;">
                <p style="margin:0 0 28px;font-size:30px;font-weight:800;
                  line-height:1;color:${COLOR.text};">
                  Hacka<span style="color:${COLOR.green};
                    font-style:italic;">IOL</span>
                </p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 8px 0;text-align:center;">
                ${renderFooter()}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
 * Renders the verification code email.
 * @param {string} code The plaintext code.
 * @return {string} The full HTML document.
 */
export function renderVerificationCodeHtml(code: string): string {
  return renderEmailShell(`
    <p style="${STYLE.heading}">Tu c&oacute;digo de verificaci&oacute;n</p>
    <p style="${STYLE.bodyText}">
      Ingresalo en el formulario para seguir con tu inscripci&oacute;n.
    </p>
    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td align="center" style="${STYLE.card}">
          <span style="${STYLE.code}">${code}</span>
        </td>
      </tr>
    </table>
    <p style="${STYLE.fine}">
      Expira en 10 minutos. Si no lo pediste vos, ignor&aacute; este mensaje.
    </p>
  `);
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
  const text =
    `Tu código de verificación es ${code}. Expira en 10 minutos.\n` +
    "Si no lo pediste vos, ignorá este mensaje.";
  await sendEmail(
    email,
    "Tu código de verificación para HackaIOL",
    text,
    renderVerificationCodeHtml(code),
  );
}

export type ConfirmationTeam = {
  name: string;
  code: string;
  memberCount: number;
};

/**
 * Renders one label/value cell of the event details row.
 * @param {string} label Small uppercase label.
 * @param {string} value The value under it.
 * @return {string} Table cell HTML.
 */
function renderDetail(label: string, value: string): string {
  return `
    <td valign="top" style="padding:0 12px 0 0;">
      <p style="${STYLE.detailLabel}">${label}</p>
      <p style="${STYLE.detailValue}">${value}</p>
    </td>
  `;
}

/**
 * Renders the post-signup confirmation email: greeting, event details,
 * team card with its invite code, event page button, and the
 * participation rules (team-only, punctuality).
 * @param {string} name The participant's name, as typed.
 * @param {ConfirmationTeam} team Team info to include.
 * @return {string} The full HTML document.
 */
export function renderSignupConfirmationHtml(
  name: string,
  team: ConfirmationTeam,
): string {
  return renderEmailShell(`
    <p style="${STYLE.heading}">Hola ${escapeHtml(name)}</p>
    <p style="${STYLE.bodyText}">
      Recibimos tu inscripci&oacute;n a HackaIOL.
    </p>

    <div style="${STYLE.notice};margin:0 0 28px;">
      <p style="${STYLE.noticeTitle}">
        Tu lugar todav&iacute;a no est&aacute; confirmado
      </p>
      <p style="${STYLE.noticeText};margin:0;">
        Revisamos cada inscripci&oacute;n y les damos prioridad a estudiantes
        universitarios. Si qued&aacute;s, te avisamos por email y ah&iacute;
        te mandamos la direcci&oacute;n.
      </p>
    </div>

    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0"
      style="margin:0 0 24px;border-top:1px solid ${COLOR.line};
        border-bottom:1px solid ${COLOR.line};">
      <tr><td colspan="3" style="height:16px;line-height:16px;">&nbsp;</td></tr>
      <tr>
        ${renderDetail("Fecha", EVENT_DATE)}
        ${renderDetail("Horario", EVENT_TIME)}
        ${renderDetail("Sede", EVENT_PLACE)}
      </tr>
      <tr><td colspan="3" style="height:16px;line-height:16px;">&nbsp;</td></tr>
    </table>

    <p style="${STYLE.sectionLabel}">Tu equipo</p>
    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="${STYLE.card}">
          <p style="margin:0 0 4px;font-size:16px;font-weight:700;
            color:${COLOR.text};">
            ${escapeHtml(team.name)}
          </p>
          <p style="margin:0 0 8px;">
            <span style="${STYLE.teamCode}">${escapeHtml(team.code)}</span>
          </p>
          <p style="${STYLE.fine}">
            ${team.memberCount} de ${MAX_TEAM_SIZE} integrantes. Pas&aacute;le
            este c&oacute;digo al resto de tu equipo para que se sumen.
          </p>
        </td>
      </tr>
    </table>

    <p style="text-align:center;margin:0 0 32px;">
      <a href="${EVENT_PAGE_URL}" style="${STYLE.button}">
        Ver p&aacute;gina del evento
      </a>
    </p>

    <div style="${STYLE.notice}">
      <p style="${STYLE.noticeTitle}">Importante</p>
      <p style="${STYLE.noticeText}">
        Se participa solo en equipos de ${MAX_TEAM_SIZE} personas. No se
        aceptan inscripciones individuales.
      </p>
      <p style="${STYLE.noticeText}">
        Pedimos puntualidad. No vamos a aceptar participantes que lleguen
        despu&eacute;s de la hora acordada.
      </p>
      <p style="${STYLE.noticeText};margin:0;">
        La comida corre por nuestra cuenta. Solo tra&eacute; tu laptop.
      </p>
    </div>
  `);
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
  const text =
    `Hola ${name}\n\n` +
    "Recibimos tu inscripción a HackaIOL.\n\n" +
    "Tu lugar todavía no está confirmado. Revisamos cada inscripción y " +
    "les damos prioridad a estudiantes universitarios. Si quedás, te " +
    "avisamos por email y ahí te mandamos la dirección.\n\n" +
    `Fecha ${EVENT_DATE}\n` +
    `Horario ${EVENT_TIME}\n` +
    `Sede ${EVENT_PLACE.toLowerCase()}\n\n` +
    `Tu equipo es ${team.name}, con el código ${team.code} ` +
    `(${team.memberCount} de ${MAX_TEAM_SIZE} integrantes). ` +
    "Pasále este código al resto de tu equipo para que se sumen.\n\n" +
    `Página del evento ${EVENT_PAGE_URL}\n\n` +
    `Importante. Se participa solo en equipos de ${MAX_TEAM_SIZE} ` +
    "personas, no se aceptan inscripciones individuales. Pedimos " +
    "puntualidad, no vamos a aceptar participantes que lleguen después " +
    "de la hora acordada. La comida corre por nuestra cuenta, solo traé " +
    "tu laptop.";
  await sendEmail(
    email,
    "Recibimos tu inscripción a HackaIOL",
    text,
    renderSignupConfirmationHtml(name, team),
  );
}

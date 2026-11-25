import {MAX_TEAM_SIZE} from "./team";

// Email templates only: no SMTP and no Firebase imports, so they can be
// rendered on their own to preview them. Sending lives in email.ts.
//
// They follow the site: the sign up "pass" (green stub with the event
// data on a purple panel), the same few text styles (green eyebrow, white
// extrabold title, grey body, three weights) and the green tape button.

export const FROM_EMAIL = "computersociety@itba.edu.ar";

// TODO: swap for the real event page once the domain is decided.
export const EVENT_PAGE_URL = "https://csitba-hackaiol.web.app";

// TODO: fill in the venue once it is confirmed.
const EVENT = {
  date: "12 DIC",
  dateLong: "12 de diciembre",
  time: "11 a 19 h",
  place: "TBA",
};

const INSTAGRAM_URL = "https://www.instagram.com/computer.society.itba/";
const LINKEDIN_URL = "https://www.linkedin.com/company/30092847/";

export const LOGOS = [
  {cid: "iol-logo", file: "iol-logo.png", width: 142, height: 40},
  {cid: "cs-logo", file: "cs-logo.png", width: 116, height: 48},
];

// Built for dark rendering, with explicit bgcolor attributes so clients
// that force their own theme keep the purple.
const COLOR = {
  bg: "#160934",
  bgGlow: "#353587",
  panel: "#1e1650",
  border: "#463e94",
  coupon: "#1b2a4c",
  text: "#ffffff",
  textDim: "#c7cedb",
  green: "#00d37f",
  ink: "#072016",
  inkSoft: "#2e7a55",
};

const FONT = "'Barlow',Arial,Helvetica,sans-serif";
const MONO = "'Courier New',Courier,monospace";

// The same text styles as the site (type-* utilities in index.css).
const TYPE = {
  eyebrow:
    "margin:0;font-size:12px;line-height:16px;font-weight:700;" +
    `letter-spacing:0.14em;text-transform:uppercase;color:${COLOR.green};`,
  title:
    "margin:8px 0 0;font-size:30px;line-height:1.15;font-weight:800;" +
    `letter-spacing:-0.02em;color:${COLOR.text};`,
  heading:
    "margin:0;font-size:16px;line-height:24px;font-weight:700;" +
    `color:${COLOR.text};`,
  body:
    `margin:8px 0 0;font-size:16px;line-height:1.6;color:${COLOR.textDim};`,
  small:
    `margin:4px 0 0;font-size:14px;line-height:20px;color:${COLOR.textDim};`,
};

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
 * Vertical space between blocks, as a table row so every client keeps it.
 * @param {number} px Height in pixels.
 * @return {string} Spacer HTML.
 */
function space(px: number): string {
  return `<div style="height:${px}px;line-height:${px}px;` +
    "font-size:1px;\">&nbsp;</div>";
}

/**
 * The green stub at the top of the pass with the event data, like the
 * sign up page on mobile.
 * @return {string} Table row HTML.
 */
function renderStub(): string {
  const items = [
    ["Fecha", EVENT.date],
    ["Horario", EVENT.time],
    ["Sede", EVENT.place],
  ];
  const cells = items.map(([label, value]) => `
    <td valign="top" style="padding:0 12px 0 0;">
      <p style="margin:0;font-size:12px;line-height:16px;font-weight:700;
        letter-spacing:0.14em;text-transform:uppercase;
        color:${COLOR.inkSoft};">${label}</p>
      <p style="margin:2px 0 0;font-size:16px;line-height:24px;
        font-weight:700;color:${COLOR.ink};">${value}</p>
    </td>`).join("");
  return `
    <tr>
      <td bgcolor="${COLOR.green}" style="background-color:${COLOR.green};
        padding:24px 32px;border-radius:16px 16px 0 0;
        border-bottom:2px dashed ${COLOR.inkSoft};">
        <table role="presentation" width="100%" cellpadding="0"
          cellspacing="0" border="0">
          <tr>${cells}</tr>
        </table>
      </td>
    </tr>`;
}

/**
 * The HackaIOL wordmark as on the home: white, with IOL in green italic.
 * @return {string} HTML.
 */
function renderWordmark(): string {
  return `<p style="margin:0 0 28px;font-size:40px;line-height:0.9;
    font-weight:800;letter-spacing:-0.045em;color:${COLOR.text};">Hacka<span
    style="color:${COLOR.green};font-style:italic;">IOL</span></p>`;
}

/**
 * The dashed coupon used for codes, like the team code in the form.
 * @param {string} label Eyebrow above the code.
 * @param {string} innerHtml Content under the eyebrow.
 * @return {string} Table HTML.
 */
function renderCoupon(label: string, innerHtml: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0">
      <tr>
        <td bgcolor="${COLOR.coupon}" style="background-color:${COLOR.coupon};
          border:1px dashed ${COLOR.green};border-radius:12px;
          padding:18px 22px;">
          <p style="${TYPE.eyebrow}">${label}</p>
          ${innerHtml}
        </td>
      </tr>
    </table>`;
}

/**
 * The primary action, like the site's green tape.
 * @param {string} href Link target.
 * @param {string} label Button text.
 * @return {string} Table HTML.
 */
function renderButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td bgcolor="${COLOR.green}" style="background-color:${COLOR.green};
          border-radius:10px;">
          <a href="${href}" style="display:inline-block;padding:16px 28px;
            font-family:${FONT};font-size:18px;line-height:1;font-weight:800;
            text-transform:uppercase;color:${COLOR.ink};
            text-decoration:none;">${label}&nbsp;&nbsp;<span
            style="font-size:10px;vertical-align:middle;">&#9650;</span></a>
        </td>
      </tr>
    </table>`;
}

/**
 * Wraps the email content in the shared shell: logos, the panel with the
 * wordmark (with the green event stub on top when asked) and the footer.
 * @param {string} bodyHtml Inner content HTML.
 * @param {boolean} withStub Whether to show the event data stub.
 * @return {string} The full HTML document.
 */
function renderShell(bodyHtml: string, withStub = false): string {
  const [iol, cs] = LOGOS;
  return `<!DOCTYPE html>
<html lang="es">
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
            style="width:100%;max-width:560px;font-family:${FONT};">
            <tr>
              <td style="padding:0 4px 28px;">
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
              <td style="border:2px solid ${COLOR.border};
                border-radius:18px;">
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0">
                  ${withStub ? renderStub() : ""}
                  <tr>
                    <td bgcolor="${COLOR.panel}"
                      style="background-color:${COLOR.panel};
                        padding:36px 32px 40px;
                        border-radius:${withStub ? "0 0 16px 16px" : "16px"};">
                      ${renderWordmark()}
                      ${bodyHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 8px 0;">
                <p style="${TYPE.small}">
                  HackaIOL es una hackathon de Computer Society ITBA junto a
                  IOL Inversiones.
                </p>
                <p style="${TYPE.small};margin-top:12px;">
                  <a href="${INSTAGRAM_URL}"
                    style="color:${COLOR.textDim};">Instagram</a>
                  &nbsp;&nbsp;&nbsp;
                  <a href="${LINKEDIN_URL}"
                    style="color:${COLOR.textDim};">LinkedIn</a>
                  &nbsp;&nbsp;&nbsp;
                  <a href="mailto:${FROM_EMAIL}"
                    style="color:${COLOR.textDim};">${FROM_EMAIL}</a>
                </p>
                <p style="${TYPE.small};margin-top:12px;">
                  &copy; 2026 Computer Society ITBA
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export const VERIFICATION_SUBJECT = "Tu código de verificación para HackaIOL";

/**
 * Renders the verification code email.
 * @param {string} code The plaintext code.
 * @return {string} The full HTML document.
 */
export function renderVerificationCodeHtml(code: string): string {
  return renderShell(`
    <p style="${TYPE.title}">Tu c&oacute;digo</p>
    ${space(24)}
    ${renderCoupon("C&oacute;digo", `
      <p style="margin:6px 0 0;font-family:${MONO};font-size:36px;
        line-height:44px;font-weight:700;letter-spacing:0.3em;
        color:${COLOR.text};">${escapeHtml(code)}</p>`)}
    ${space(24)}
    <p style="${TYPE.small}">
      Vence en 10 minutos. Si no lo pediste vos, ignor&aacute; este mensaje.
    </p>
  `);
}

/**
 * Plain-text version of the verification code email.
 * @param {string} code The plaintext code.
 * @return {string} Text body.
 */
export function verificationCodeText(code: string): string {
  return `Tu código de verificación para HackaIOL es ${code}.\n\n` +
    "Vence en 10 minutos. Si no lo pediste vos, ignorá este mensaje.";
}

export type Teammate = {
  name: string;
  email: string;
};

export type ConfirmationTeam = {
  name: string;
  code: string;
  memberCount: number;
  /** Who signed up to the team before, without the recipient. */
  teammates: Teammate[];
};

/**
 * One line about how full the team is, for the HTML and text emails.
 * @param {ConfirmationTeam} team Team info.
 * @return {string} Plain sentence, no HTML.
 */
function teamStatus(team: ConfirmationTeam): string {
  if (team.memberCount >= MAX_TEAM_SIZE) {
    return "Tu equipo está completo.";
  }
  const missing = MAX_TEAM_SIZE - team.memberCount;
  const who = missing === 1 ? "falta 1 integrante" :
    `faltan ${missing} integrantes`;
  return `${team.memberCount} de ${MAX_TEAM_SIZE}, ${who}. Pasale este ` +
    "código al resto de tu equipo para que se sumen.";
}

/**
 * The teammates inside the team coupon: name and email of each.
 * @param {Teammate[]} teammates Who already joined.
 * @return {string} HTML, empty when nobody joined yet.
 */
function renderTeammates(teammates: Teammate[]): string {
  if (!teammates.length) return "";
  const rows = teammates.map((mate, i) => `
    ${i ? space(10) : ""}
    <p style="${TYPE.heading}">${escapeHtml(mate.name)}</p>
    <p style="${TYPE.small};margin-top:0;">
      <a href="mailto:${escapeHtml(mate.email)}"
        style="color:${COLOR.textDim};">${escapeHtml(mate.email)}</a>
    </p>`).join("");
  return `${space(20)}<p style="${TYPE.eyebrow}">Integrantes</p>
    ${space(8)}${rows}`;
}

export const CONFIRMATION_SUBJECT = "Recibimos tu inscripción a HackaIOL";

/**
 * Renders the post-signup confirmation email: greeting, the "not yet
 * confirmed" notice, the team with its code and teammates, and the event
 * page button.
 * @param {string} name The participant's name, as typed.
 * @param {ConfirmationTeam} team Team info to include.
 * @return {string} The full HTML document.
 */
export function renderSignupConfirmationHtml(
  name: string,
  team: ConfirmationTeam,
): string {
  return renderShell(`
    <p style="${TYPE.eyebrow}">Inscripci&oacute;n recibida</p>
    <p style="${TYPE.title}">Hola ${escapeHtml(name)}</p>
    <p style="${TYPE.body}">
      Recibimos tu inscripci&oacute;n a HackaIOL. Tu lugar todav&iacute;a
      no est&aacute; confirmado. Revisamos cada inscripci&oacute;n y les
      damos prioridad a estudiantes universitarios. Si qued&aacute;s, te
      avisamos por email y ah&iacute; te mandamos la direcci&oacute;n.
    </p>
    ${space(32)}
    ${renderCoupon("Tu equipo", `
      <p style="${TYPE.heading};margin-top:6px;">
        ${escapeHtml(team.name)}
      </p>
      <p style="margin:2px 0 0;font-family:${MONO};font-size:28px;
        line-height:36px;font-weight:700;letter-spacing:0.04em;
        color:${COLOR.text};">${escapeHtml(team.code)}</p>
      ${renderTeammates(team.teammates)}
      ${space(20)}
      <p style="${TYPE.small};margin-top:0;">${teamStatus(team)}</p>`)}
    ${space(32)}
    ${renderButton(EVENT_PAGE_URL, "Ver el evento")}
  `, true);
}

/**
 * Plain-text version of the confirmation email.
 * @param {string} name The participant's name, as typed.
 * @param {ConfirmationTeam} team Team info to include.
 * @return {string} Text body.
 */
export function signupConfirmationText(
  name: string,
  team: ConfirmationTeam,
): string {
  return `Hola ${name}\n\n` +
    "Recibimos tu inscripción a HackaIOL. Tu lugar todavía no está " +
    "confirmado. Revisamos cada inscripción y les damos prioridad a " +
    "estudiantes universitarios. Si quedás, te avisamos por email y ahí " +
    "te mandamos la dirección.\n\n" +
    `Fecha ${EVENT.dateLong}\n` +
    `Horario ${EVENT.time}\n` +
    `Sede ${EVENT.place}\n\n` +
    `Tu equipo es ${team.name}, con el código ${team.code}.\n` +
    team.teammates.map((mate) => `${mate.name} (${mate.email})\n`)
      .join("") +
    `${teamStatus(team)}\n\n` +
    `Página del evento ${EVENT_PAGE_URL}`;
}

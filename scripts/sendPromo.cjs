// Sends the HackaIOL promo email to everyone in exports/participantes.csv.
//
// It first reruns scripts/exportParticipants.cjs, so the list is fresh and
// whoever signed up for HackaIOL in the meantime is left out (that check
// reads live data). Then it sends one email per row through the club's
// Gmail, the same path the sign-up emails use.
//
// Every address that got the email is appended to exports/enviados.txt and
// marked as sent in Firestore. Both are checked on the next run, so nobody
// gets it twice and a run that stops halfway can be resumed.
//
// Tracking: each email gets a random token and a promoRecipients doc in the
// hackaiol Firestore database (email, sentAt, opens, clicks). The button
// and a 1x1 image point at /api/t/... (functions/src/promoTracking.ts), so
// the hackaiolPromoTrack function and the hosting rewrite must be deployed
// before sending. scripts/promoStats.cjs reads the results.
//
// Setup (from the repo root):
//   cd functions && npm run build && cd ..       (compiles the template)
//   gcloud auth application-default login         (for the export)
//   $env:GMAIL_APP_PASSWORD = "..."               (the club's app password)
//
// Usage:
//   node scripts/sendPromo.cjs                    dry run, sends nothing
//   node scripts/sendPromo.cjs --test you@mail    sends one copy to you
//   node scripts/sendPromo.cjs --send             sends to the whole list
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const FUNCTIONS = path.join(ROOT, 'functions')
const EXPORTS = path.join(ROOT, 'exports')
const LIST = path.join(EXPORTS, 'participantes.csv')
const SENT_LOG = path.join(EXPORTS, 'enviados.txt')
const FAILED_LOG = path.join(EXPORTS, 'fallidos.txt')

// Gmail throttles bursts; one email every 1.5 s keeps ~480 mails in ~12 min.
const DELAY_MS = 1500

const nodemailer = require(path.join(FUNCTIONS, 'node_modules', 'nodemailer'))
const templates = require(
  path.join(FUNCTIONS, 'lib', 'lib', 'emailTemplates.js'),
)
const adminLib = path.join(FUNCTIONS, 'node_modules', 'firebase-admin', 'lib')
const { initializeApp } = require(path.join(adminLib, 'app'))
const { getFirestore, Timestamp } = require(path.join(adminLib, 'firestore'))

// Same project and database as the functions (functions/src/admin.ts).
const db = getFirestore(
  initializeApp({ projectId: 'webpage-36e40' }),
  'hackaiol',
)
const PROMO_COLLECTION = 'promoRecipients'

// Creates the tracking doc before sending, so an open that arrives fast
// is never lost. Test sends are flagged and left out of the stats.
async function newRecipient(email, test) {
  const token = crypto.randomBytes(16).toString('base64url')
  await db.collection(PROMO_COLLECTION).doc(token).create({
    email,
    test,
    sentAt: null,
    opens: 0,
    clicks: 0,
    createdAt: Timestamp.now(),
  })
  return token
}

async function markSent(token) {
  await db
    .collection(PROMO_COLLECTION)
    .doc(token)
    .update({ sentAt: Timestamp.now() })
}

const args = process.argv.slice(2)
const mode = args.includes('--send')
  ? 'send'
  : args.includes('--test')
    ? 'test'
    : 'dry'
const testTo = mode === 'test' ? args[args.indexOf('--test') + 1] : null

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

function readList() {
  const lines = fs
    .readFileSync(LIST, 'utf8')
    .replace(/^﻿/, '')
    .trim()
    .split(/\r?\n/)
  return lines
    .slice(1)
    .map(parseCsvLine)
    .map(([email, first]) => ({ email, first }))
}

// "FACUNDO" or "juan ignacio" -> "Facundo", "Juan Ignacio".
function displayName(first) {
  return first
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
}

// Who already got the promo: the local log plus every real (non-test)
// promoRecipients doc marked as sent, so nobody gets it twice even if the
// log is lost or the send runs from another computer.
async function readSent() {
  const sent = new Set()
  if (fs.existsSync(SENT_LOG)) {
    fs.readFileSync(SENT_LOG, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((e) => sent.add(e))
  }
  const snap = await db
    .collection(PROMO_COLLECTION)
    .where('test', '==', false)
    .get()
  snap.docs
    .filter((d) => d.get('sentAt'))
    .forEach((d) => sent.add(d.get('email')))
  return sent
}

const attachments = templates.PROMO_IMAGES.map(({ cid, file }) => ({
  filename: file,
  content: fs.readFileSync(path.join(FUNCTIONS, 'assets', file)),
  cid,
}))

function message(to, first, token) {
  const name = displayName(first)
  return {
    from: `HackaIOL <${templates.FROM_EMAIL}>`,
    to,
    subject: templates.PROMO_SUBJECT,
    text: templates.promoText(name, token),
    html: templates.renderPromoHtml(name, token),
    attachments,
  }
}

function transporter() {
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!pass) {
    console.error('Falta GMAIL_APP_PASSWORD en el entorno.')
    process.exit(1)
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: templates.FROM_EMAIL, pass },
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

;(async () => {
  if (mode === 'test') {
    if (!testTo || !testTo.includes('@')) {
      console.error('Uso: node scripts/sendPromo.cjs --test tu@mail')
      process.exit(1)
    }
    const smtp = transporter()
    const token = await newRecipient(testTo, true)
    await smtp.sendMail(message(testTo, 'Martina', token))
    await markSent(token)
    console.log(
      `Prueba enviada a ${testTo}. Abrila y tocá el botón, después ` +
        'corré node scripts/promoStats.cjs --test para ver si se registró.',
    )
    return
  }

  // Fresh list, including the last check against HackaIOL sign-ups.
  execFileSync(
    process.execPath,
    [path.join(__dirname, 'exportParticipants.cjs')],
    { stdio: 'inherit' },
  )

  const sent = await readSent()
  const list = readList()
  const pending = list.filter((row) => !sent.has(row.email))
  console.log(
    `\nEn la lista: ${list.length}. Ya recibieron el mail: ` +
      `${list.length - pending.length}. Por enviar: ${pending.length}.`,
  )

  if (mode === 'dry') {
    const sample = pending
      .slice(0, 5)
      .map((row) => `  ${row.email} -> "Hola ${displayName(row.first)}"`)
    console.log('Ejemplos:\n' + sample.join('\n'))
    console.log('\nModo prueba: no se mandó nada. Usá --send para enviar.')
    return
  }

  const smtp = transporter()
  let ok = 0
  let failed = 0
  for (const [i, row] of pending.entries()) {
    try {
      const token = await newRecipient(row.email, false)
      await smtp.sendMail(message(row.email, row.first, token))
      fs.appendFileSync(SENT_LOG, row.email + '\n')
      await markSent(token)
      ok++
    } catch (err) {
      fs.appendFileSync(FAILED_LOG, `${row.email}\t${err.message}\n`)
      failed++
    }
    process.stdout.write(
      `\r${i + 1}/${pending.length} (ok ${ok}, fallidos ${failed})`,
    )
    if (i < pending.length - 1) await sleep(DELAY_MS)
  }
  console.log(
    `\nListo. Enviados ${ok}, fallidos ${failed}.` +
      (failed ? ` Detalle en ${FAILED_LOG}.` : ''),
  )
})()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .then(() => process.exit(0))

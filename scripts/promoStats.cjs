// Reports how the HackaIOL promo email did: how many got it, opened it,
// clicked the sign up button and actually signed up afterwards.
//
// Reads the promoRecipients docs that scripts/sendPromo.cjs creates and the
// hackaiolPromoTrack function updates, plus the HackaIOL sign-ups.
// Uses Application Default Credentials (gcloud auth application-default login).
//
// Usage, from the repo root:
//   node scripts/promoStats.cjs          the real send
//   node scripts/promoStats.cjs --test   only the test sends
//   node scripts/promoStats.cjs --csv    also writes exports/promo-stats.csv
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const adminLib = path.join(
  ROOT,
  'functions',
  'node_modules',
  'firebase-admin',
  'lib',
)
const { initializeApp } = require(path.join(adminLib, 'app'))
const { getFirestore } = require(path.join(adminLib, 'firestore'))

const db = getFirestore(
  initializeApp({ projectId: 'webpage-36e40' }),
  'hackaiol',
)
const onlyTests = process.argv.includes('--test')
const writeCsv = process.argv.includes('--csv')

const pct = (n, of) => (of ? `${Math.round((n / of) * 1000) / 10}%` : '-')
const iso = (ts) => (ts && ts.toDate ? ts.toDate().toISOString() : '')

;(async () => {
  const [recipients, signups] = await Promise.all([
    db.collection('promoRecipients').get(),
    db.collection('signups').get(),
  ])
  const signedUpAt = new Map(
    signups.docs.map((d) => [d.id, d.get('createdAt')]),
  )

  const rows = recipients.docs
    .map((d) => d.data())
    .filter((r) => Boolean(r.test) === onlyTests && r.sentAt)

  const opened = rows.filter((r) => r.opens > 0)
  const clicked = rows.filter((r) => r.clicks > 0)
  // Signed up after getting the email, whether or not they clicked.
  const converted = rows.filter((r) => {
    const at = signedUpAt.get(r.email)
    return at && at.toMillis() >= r.sentAt.toMillis()
  })

  const sent = rows.length
  const line = (label, n, extra = '') =>
    console.log(
      `${label.padEnd(28)} ${String(n).padStart(5)}  ${pct(n, sent).padStart(6)}${extra}`,
    )

  console.log(onlyTests ? 'Envíos de prueba\n' : 'Mail promocional HackaIOL\n')
  line('Enviados', sent)
  line(
    'Abrieron (al menos una vez)',
    opened.length,
    `   aperturas totales ${rows.reduce((s, r) => s + (r.opens || 0), 0)}`,
  )
  line(
    'Tocaron el botón',
    clicked.length,
    `   clicks totales ${rows.reduce((s, r) => s + (r.clicks || 0), 0)}`,
  )
  line('Se anotaron después', converted.length)
  if (clicked.length) {
    console.log(
      `\nDe los que tocaron el botón, se anotaron ` +
        `${clicked.filter((r) => converted.includes(r)).length} de ${clicked.length}.`,
    )
  }

  if (writeCsv) {
    const out = path.join(ROOT, 'exports', 'promo-stats.csv')
    const header =
      'email,enviado,aperturas,primera_apertura,clicks,primer_click,se_anoto'
    const body = rows
      .sort((a, b) => a.email.localeCompare(b.email))
      .map((r) =>
        [
          r.email,
          iso(r.sentAt),
          r.opens || 0,
          iso(r.firstOpenAt),
          r.clicks || 0,
          iso(r.firstClickAt),
          converted.includes(r) ? 'si' : 'no',
        ].join(','),
      )
    fs.writeFileSync(out, '﻿' + [header, ...body].join('\n') + '\n', 'utf8')
    console.log(`\nDetalle por persona en ${out}`)
  }
  process.exit(0)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})

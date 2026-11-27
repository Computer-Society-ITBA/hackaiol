// Exports every event participant found in Firestore to one CSV row per
// email: email, first name, last name and the events they signed up for.
//
// Uses Application Default Credentials:
//   gcloud auth application-default login
// Run from the repo root (reuses firebase-admin from functions/):
//   node scripts/exportParticipants.cjs [output.csv]
//
// The output is the HackAIOL promo mailing list: whoever already signed up
// for HackAIOL is dropped as the last step, so run it right before sending.
//
// Left out on purpose: test-hackitba (test data), judges, mentors and admins
// (including mentors of older HackITBA editions).
const fs = require('fs')
const path = require('path')

const nm = path.join(__dirname, '..', 'functions', 'node_modules')
const { initializeApp } = require(path.join(nm, 'firebase-admin', 'lib', 'app'))
const { getFirestore } = require(
  path.join(nm, 'firebase-admin', 'lib', 'firestore'),
)
const { getAuth } = require(path.join(nm, 'firebase-admin', 'lib', 'auth'))

// Firebase Auth (needed for older HackITBA editions) rejects user ADC
// without a quota project.
process.env.GOOGLE_CLOUD_QUOTA_PROJECT ??= 'hackitba-c1e4c'

const out =
  process.argv[2] || path.join(__dirname, '..', 'exports', 'participantes.csv')

const apps = {}
function app(project) {
  apps[project] ??= initializeApp({ projectId: project }, project)
  return apps[project]
}
const db = (project, id) => getFirestore(app(project), id)

const clean = (v) =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : ''
const normEmail = (v) => clean(v).toLowerCase()
function splitName(full) {
  const parts = clean(full).split(' ').filter(Boolean)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') }
}
function yearOf(v, fallback) {
  if (v && typeof v.toDate === 'function') return v.toDate().getUTCFullYear()
  return fallback
}

// email -> {email, first, last, nameIsSplit, events:Set}
const people = new Map()
function add(email, first, last, nameIsSplit, event) {
  email = normEmail(email)
  if (!email.includes('@')) return
  let p = people.get(email)
  if (!p) {
    p = { email, first: '', last: '', nameIsSplit: false, events: new Set() }
    people.set(email, p)
  }
  // Prefer names stored as separate first/last fields over a split full name.
  if ((!p.first && first) || (nameIsSplit && !p.nameIsSplit && first)) {
    p.first = clean(first)
    p.last = clean(last)
    p.nameIsSplit = nameIsSplit
  }
  p.events.add(event)
}

async function hackaiol() {
  const snap = await db('webpage-36e40', 'hackaiol').collection('signups').get()
  for (const d of snap.docs) {
    const x = d.data()
    const { first, last } = splitName(x.name)
    add(
      x.email || d.id,
      first,
      last,
      false,
      `HackAIOL ${yearOf(x.createdAt, 2026)}`,
    )
  }
  return snap.size
}

const rejectedHackitba = new Set()

async function hackitba2026() {
  const snap = await db('webpage-36e40', 'hackitba')
    .collection('users')
    .where('role', '==', 'participant')
    .get()
  let rejected = 0
  for (const d of snap.docs) {
    const x = d.data()
    // Rejected applicants are left out; they still appear if they took part
    // in another event.
    if (x.status === 'rejected' || x.participationStatus === 'rejected') {
      rejected++
      rejectedHackitba.add(normEmail(x.email))
      continue
    }
    add(
      x.email,
      x.name,
      x.surname,
      true,
      `HackITBA ${yearOf(x.createdAt, 2026)}`,
    )
  }
  return { kept: snap.size - rejected, rejected }
}

async function quantumjam() {
  const qj = db('webpage-36e40', 'quantumjam')
  const comp = await qj.collection('competitionSignups').get()
  for (const d of comp.docs) {
    const x = d.data()
    add(
      x.email || d.id,
      x.firstName,
      x.lastName,
      true,
      `QuantumJam ${yearOf(x.createdAt, '')} (competencia)`.replace('  ', ' '),
    )
  }
  const ws = await qj.collection('workshopSignups').get()
  for (const d of ws.docs) {
    const x = d.data()
    const { first, last } = splitName(x.name)
    add(
      x.email || d.id,
      first,
      last,
      false,
      `QuantumJam ${yearOf(x.createdAt, '')} (workshop)`.replace('  ', ' '),
    )
  }
  return comp.size + ws.size
}

// Older HackITBA editions key users by Firebase Auth uid; the email lives
// in Auth when the doc lacks it.
async function hackitbaLegacy() {
  const project = 'hackitba-c1e4c'
  const store = db(project, '(default)')
  const authEmails = new Map()
  let authError = null
  try {
    let token
    do {
      const page = await getAuth(app(project)).listUsers(1000, token)
      for (const u of page.users)
        authEmails.set(u.uid, { email: u.email, name: u.displayName })
      token = page.pageToken
    } while (token)
  } catch (e) {
    authError = e.message
  }
  let count = 0
  const missing = {}
  for (const year of ['2023', '2024', '2025']) {
    const snap = await store.collection(`${year}_users`).get()
    for (const d of snap.docs) {
      const x = d.data()
      // Mentors share these collections with participants.
      if (x.mentor === true) continue
      const auth = authEmails.get(d.id) || {}
      const email = x.email || auth.email
      if (!email) {
        missing[year] = (missing[year] || 0) + 1
        continue
      }
      const { first, last } = splitName(x.name || auth.name)
      add(email, first, last, false, `HackITBA ${year}`)
      count++
    }
  }
  return { count, missing, authError }
}

// Same person signed up with different emails: merge rows whose full name
// matches (ignoring case, accents and punctuation). One-word names are not
// merged: in older HackITBA editions they are often nicknames or team names
// that different people share. The kept email prefers a non-academic
// domain (university accounts expire), then the row with more events.
const ACADEMIC = /(\.edu(\.[a-z]{2})?|\.edu\.ar)$/
const nameKey = (p) =>
  `${p.first} ${p.last}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
function mergeByName(list) {
  const groups = new Map()
  for (const p of list) {
    const key = nameKey(p)
    const k = key.includes(' ') ? key : `email:${p.email}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(p)
  }
  const merged = []
  let dropped = 0
  for (const g of groups.values()) {
    g.sort(
      (a, b) =>
        ACADEMIC.test(a.email.split('@')[1]) -
          ACADEMIC.test(b.email.split('@')[1]) ||
        b.events.size - a.events.size ||
        a.email.localeCompare(b.email),
    )
    const keep = g[0]
    for (const other of g.slice(1)) {
      for (const e of other.events) keep.events.add(e)
      dropped++
    }
    merged.push(keep)
  }
  return { merged, dropped }
}

// Manual exclusions live next to the export (gitignored, personal data):
// one email or full name per line, "#" starts a comment.
const EXCLUDE_FILE = path.join(path.dirname(out), 'excluir.txt')
function applyExclusions(list) {
  if (!fs.existsSync(EXCLUDE_FILE)) return list
  const entries = fs
    .readFileSync(EXCLUDE_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)
  const hits = new Map(entries.map((e) => [e, 0]))
  const kept = list.filter((p) => {
    const key = nameKey(p)
    const match = entries.find((e) =>
      e.includes('@')
        ? normEmail(e) === p.email
        : nameKey(splitName(e)) === key,
    )
    if (match) hits.set(match, hits.get(match) + 1)
    return !match
  })
  const unmatched = entries.filter((e) => hits.get(e) === 0)
  const multi = entries
    .filter((e) => hits.get(e) > 1)
    .map((e) => `${e} (${hits.get(e)})`)
  console.log(
    `Excluded: ${list.length - kept.length} rows from ${entries.length} entries`,
  )
  if (unmatched.length) console.log('Exclusions with no match:', unmatched)
  if (multi.length) console.log('Exclusions matching several rows:', multi)
  return kept
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

;(async () => {
  const counts = {
    hackaiol: await hackaiol(),
    hackitba2026: await hackitba2026(),
    quantumjam: await quantumjam(),
    hackitbaLegacy: await hackitbaLegacy(),
  }

  const { merged, dropped } = mergeByName([...people.values()])
  // A promo email needs both names to greet the person.
  const named = merged.filter((p) => p.first && p.last)
  console.log(
    'Dropped for missing first or last name:',
    merged.length - named.length,
  )
  const candidates = applyExclusions(named)
  // Last check before sending: the mail promotes HackAIOL, so drop whoever
  // already signed up for it. Reads live data, so rerun this right before
  // the send. The name merge above also catches a sign-up with another email.
  const rows = candidates.filter(
    (p) => ![...p.events].some((e) => e.startsWith('HackAIOL')),
  )
  console.log(
    'Dropped as already signed up for HackAIOL:',
    candidates.length - rows.length,
  )
  rows.sort((a, b) => a.email.localeCompare(b.email))
  console.log('Rows merged by matching name:', dropped)
  const lines = [['email', 'nombre', 'apellido', 'eventos'].join(',')]
  for (const p of rows) {
    lines.push(
      [p.email, p.first, p.last, [...p.events].sort().join('; ')]
        .map(csvCell)
        .join(','),
    )
  }
  fs.mkdirSync(path.dirname(out), { recursive: true })
  // BOM so Excel opens accents correctly.
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8')

  const perEvent = {}
  for (const p of rows)
    for (const e of p.events) perEvent[e] = (perEvent[e] || 0) + 1
  console.log('Docs read:', JSON.stringify(counts))
  console.log('Per event:', perEvent)
  console.log(
    'In more than one event:',
    rows.filter((p) => p.events.size > 1).length,
  )
  console.log('Without last name:', rows.filter((p) => !p.last).length)
  console.log(
    'Rejected from HackITBA but kept for another event:',
    rows
      .filter((p) => rejectedHackitba.has(p.email))
      .map((p) => [...p.events].join('; ')),
  )
  console.log(`Unique emails: ${rows.length} -> ${out}`)
  process.exit(0)
})()

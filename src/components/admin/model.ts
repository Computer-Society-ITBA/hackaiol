import type { AdminData, AdminSignup, AdminTeam } from '@/lib/adminApi'

export const TIME_ZONE = 'America/Argentina/Buenos_Aires'

// Every participant field an admin can filter on, plus the team's own.
// Labels are under admin.fields.<key> in the locale files.
export const PARTICIPANT_FIELDS = [
  'name',
  'email',
  'dni',
  'age',
  'university',
  'major',
  'gradYear',
  'location',
  'diet',
  'github',
  'linkedin',
  'x',
  'instagram',
  'website',
  'teamChoice',
  'status',
] as const satisfies readonly (keyof AdminSignup)[]

export const TEAM_FIELDS = ['teamName', 'teamSize'] as const

export type FilterField =
  (typeof PARTICIPANT_FIELDS)[number] | (typeof TEAM_FIELDS)[number]

export const FILTER_FIELDS: readonly FilterField[] = [
  ...PARTICIPANT_FIELDS,
  ...TEAM_FIELDS,
]

export const FILTER_OPS = ['contains', 'is', 'empty', 'notEmpty'] as const
export type FilterOp = (typeof FILTER_OPS)[number]

export type Filter = { field: FilterField; op: FilterOp; value: string }

/** A participant joined with its place in sign-up order and its team. */
export type Participant = AdminSignup & {
  order: number
  team: AdminTeam | null
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Oldest first; rows without a date go last, then by email. */
function bySignupOrder(a: AdminSignup, b: AdminSignup): number {
  const ak = a.createdAt ?? '￿'
  const bk = b.createdAt ?? '￿'
  if (ak !== bk) return ak < bk ? -1 : 1
  return a.email.localeCompare(b.email)
}

export function buildParticipants(data: AdminData): Participant[] {
  const teams = new Map(data.teams.map((team) => [team.id, team]))
  return [...data.signups].sort(bySignupOrder).map((signup, index) => ({
    ...signup,
    order: index + 1,
    team: (signup.teamId && teams.get(signup.teamId)) || null,
  }))
}

export function fieldValue(p: Participant, field: FilterField): string {
  switch (field) {
    case 'teamName':
      return p.team?.name ?? ''
    case 'teamSize':
      return p.team ? String(p.team.memberCount) : ''
    default:
      return p[field] ?? ''
  }
}

function matchesFilter(p: Participant, filter: Filter): boolean {
  const value = normalize(fieldValue(p, filter.field))
  const wanted = normalize(filter.value)
  switch (filter.op) {
    case 'empty':
      return value === ''
    case 'notEmpty':
      return value !== ''
    case 'is':
      return value === wanted
    case 'contains':
      return value.includes(wanted)
  }
}

function matchesSearch(p: Participant, query: string): boolean {
  if (!query) return true
  return FILTER_FIELDS.some((field) =>
    normalize(fieldValue(p, field)).includes(query),
  )
}

export function filterParticipants(
  participants: Participant[],
  {
    status,
    query,
    filters,
  }: { status: string; query: string; filters: Filter[] },
): Participant[] {
  const q = normalize(query)
  return participants.filter(
    (p) =>
      (!status || p.status === status) &&
      matchesSearch(p, q) &&
      filters.every((filter) => matchesFilter(p, filter)),
  )
}

export type TeamGroup = { team: AdminTeam | null; members: Participant[] }

/**
 * Groups participants by team, teams in the order their first member
 * signed up, members in sign-up order. Participants with no team (or a
 * team that no longer exists) go in a last group with `team: null`.
 */
export function groupByTeam(participants: Participant[]): TeamGroup[] {
  const groups = new Map<string, TeamGroup>()
  const loose: Participant[] = []
  for (const p of participants) {
    if (!p.team) {
      loose.push(p)
      continue
    }
    const group = groups.get(p.team.id)
    if (group) group.members.push(p)
    else groups.set(p.team.id, { team: p.team, members: [p] })
  }
  const result = [...groups.values()]
  if (loose.length > 0) result.push({ team: null, members: loose })
  return result
}

/** Encodes filters for the URL as `field~op~value`, one per `f` param. */
export function encodeFilter(filter: Filter): string {
  return [filter.field, filter.op, filter.value].join('~')
}

export function decodeFilter(raw: string): Filter | null {
  const [field, op, ...rest] = raw.split('~')
  if (!FILTER_FIELDS.includes(field as FilterField)) return null
  if (!FILTER_OPS.includes(op as FilterOp)) return null
  return {
    field: field as FilterField,
    op: op as FilterOp,
    value: rest.join('~'),
  }
}

const CSV_COLUMNS = [
  'order',
  'createdAt',
  ...PARTICIPANT_FIELDS,
  'teamName',
  'teamSize',
] as const

function csvCell(value: string): string {
  // A leading =, +, - or @ would run as a formula in a spreadsheet.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function downloadParticipantsCsv(participants: Participant[]): void {
  const rows = participants.map((p) =>
    CSV_COLUMNS.map((column) => {
      if (column === 'order') return String(p.order)
      if (column === 'createdAt') return p.createdAt ?? ''
      return fieldValue(p, column)
    }),
  )
  const csv = [CSV_COLUMNS as readonly string[], ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hackaiol-participants-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

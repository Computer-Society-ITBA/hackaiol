// Client for hackaiolAdminApi (functions/src/backoffice.ts), served by
// Hosting at /api/admin/** and by the Vite dev proxy in development.

// Must match SIGNUP_STATUSES in functions/src/backoffice.ts.
export const SIGNUP_STATUSES = ['pending', 'accepted', 'rejected'] as const
export type SignupStatus = (typeof SIGNUP_STATUSES)[number]

export type AdminSignup = {
  id: string
  email: string
  name: string
  dni: string
  age: string
  university: string
  major: string
  gradYear: string
  location: string
  diet: string
  github: string
  linkedin: string
  x: string
  instagram: string
  website: string
  teamChoice: string
  teamId: string | null
  status: SignupStatus
  createdAt: string | null
  updatedAt: string | null
  statusUpdatedAt: string | null
}

export type AdminTeam = {
  id: string
  name: string
  memberCount: number
  memberEmails: string[]
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
}

export type AdminData = {
  signups: AdminSignup[]
  teams: AdminTeam[]
  maxTeamSize: number
  fetchedAt: string
}

export type AdminErrorKind =
  | 'unauthorized'
  | 'unavailable'
  | 'not-found'
  | 'already-exists'
  | 'resource-exhausted'
  | 'invalid-argument'

export class AdminApiError extends Error {
  readonly kind: AdminErrorKind

  constructor(kind: AdminErrorKind) {
    super(kind)
    this.kind = kind
  }
}

const SESSION_KEY = 'hackaiol.admin.session'

// The token is `v1.<expiry ms>.<signature>`. Only the server can check
// the signature; the client only reads the expiry to avoid sending a
// token it knows is stale.
function tokenExpiry(token: string): number {
  const expiry = Number(token.split('.')[1])
  return Number.isFinite(expiry) ? expiry : 0
}

/**
 * The stored session token, if one is present and not expired. It lives
 * in sessionStorage, so it is scoped to this tab and gone when it closes.
 * The password itself is never stored.
 */
export function getSession(): string | null {
  try {
    const token = sessionStorage.getItem(SESSION_KEY)
    if (token && tokenExpiry(token) > Date.now()) return token
    if (token) sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage blocked: the session won't survive a reload.
  }
  return null
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing stored, nothing to clear.
  }
}

function basicAuthHeader(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return `Basic ${btoa(String.fromCharCode(...bytes))}`
}

const ERROR_KINDS: ReadonlySet<string> = new Set<AdminErrorKind>([
  'not-found',
  'already-exists',
  'resource-exhausted',
  'invalid-argument',
])

/**
 * Calls the admin API. Credentials go in an explicit header with
 * `credentials: 'omit'`, so the browser neither attaches cached HTTP auth
 * nor prompts with its own dialog on a 401.
 */
async function call(
  method: 'GET' | 'POST',
  path: string,
  authorization: string,
  payload?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
      credentials: 'omit',
      cache: 'no-store',
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new AdminApiError('unavailable')
  }

  if (res.status === 401) {
    clearSession()
    throw new AdminApiError('unauthorized')
  }
  // Without the Hosting rewrite the SPA fallback answers 200 with
  // index.html, so a body that isn't JSON is treated as unavailable.
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (body as { error?: unknown } | null)?.error
    throw new AdminApiError(
      typeof error === 'string' && ERROR_KINDS.has(error)
        ? (error as AdminErrorKind)
        : 'unavailable',
    )
  }
  if (typeof body !== 'object' || body === null) {
    throw new AdminApiError('unavailable')
  }
  return body
}

function requireSession(): string {
  const token = getSession()
  if (!token) throw new AdminApiError('unauthorized')
  return `Bearer ${token}`
}

/** Trades the shared admin credentials for a session token. */
export async function signIn(
  username: string,
  password: string,
): Promise<void> {
  const body = (await call(
    'POST',
    'session',
    basicAuthHeader(username, password),
  )) as { token?: unknown }
  if (typeof body.token !== 'string') throw new AdminApiError('unavailable')
  try {
    sessionStorage.setItem(SESSION_KEY, body.token)
  } catch {
    throw new AdminApiError('unavailable')
  }
}

export async function fetchAdminData(signal?: AbortSignal): Promise<AdminData> {
  const body = (await call(
    'GET',
    'data',
    requireSession(),
    undefined,
    signal,
  )) as Partial<AdminData>
  if (!Array.isArray(body.signups) || !Array.isArray(body.teams)) {
    throw new AdminApiError('unavailable')
  }
  return body as AdminData
}

export async function setSignupStatus(
  emails: string[],
  status: SignupStatus,
): Promise<{ updated: number }> {
  return (await call('POST', 'signups/status', requireSession(), {
    emails,
    status,
  })) as { updated: number }
}

/** `teamId: null` takes the participant out of any team. */
export type TeamTarget = { teamId: string | null } | { newTeamName: string }

export async function moveSignup(
  email: string,
  target: TeamTarget,
): Promise<void> {
  await call('POST', 'signups/team', requireSession(), { email, ...target })
}

export async function renameTeam(teamId: string, name: string): Promise<void> {
  await call('POST', 'teams/rename', requireSession(), { teamId, name })
}

export async function deleteTeam(
  teamId: string,
): Promise<{ unassigned: number }> {
  return (await call('POST', 'teams/delete', requireSession(), {
    teamId,
  })) as { unassigned: number }
}

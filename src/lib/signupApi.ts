import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'

import { functions } from '@/lib/firebase'
import { withRetry } from '@/lib/retry'

export type TeamChoicePayload =
  { choice: 'create'; name: string } | { choice: 'join'; code: string }

export type SignupSubmission = {
  email: string
  verificationToken: string
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
  team: TeamChoicePayload
}

export type DraftStep = 'personal' | 'socials' | 'team'

/** Progress saved server-side so an unfinished sign-up can be resumed. */
export type SignupDraft = {
  lastCompletedStep: 'personal' | 'socials' | null
  data: Record<string, string>
}

export type DraftSave = {
  email: string
  verificationToken: string
  step: DraftStep
  data: Record<string, string>
}

export type TeamLookupResult = {
  exists: boolean
  memberCount: number
  isFull: boolean
}

const requestCodeFn = httpsCallable<
  { email: string },
  { ok: true; cooldownSeconds: number }
>(functions, 'hackaiolRequestCode')

const confirmCodeFn = httpsCallable<
  { email: string; code: string },
  { ok: true; verificationToken: string; draft: SignupDraft | null }
>(functions, 'hackaiolConfirmCode')

const saveDraftFn = httpsCallable<DraftSave, { ok: true }>(
  functions,
  'hackaiolSaveSignupDraft',
)

const submitSignupFn = httpsCallable<
  SignupSubmission,
  { ok: true; teamId: string | null }
>(functions, 'hackaiolSubmitSignup')

const lookupTeamFn = httpsCallable<{ code: string }, TeamLookupResult>(
  functions,
  'hackaiolLookupTeam',
)

// Dev-only stand-in for the backend, so every step of the form can be
// walked through before the functions are deployed. Any 6-digit code is
// accepted and any team code exists with one member. Never on in a build.
const MOCK = import.meta.env.DEV && import.meta.env.VITE_MOCK_SIGNUP === 'true'

function mock<T>(data: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(data), 600))
}

export async function requestCode(email: string) {
  if (MOCK) return mock({ ok: true as const, cooldownSeconds: 30 })
  const { data } = await withRetry(() => requestCodeFn({ email }))
  return data
}

export async function confirmCode(email: string, code: string) {
  if (MOCK) {
    return mock({
      ok: true as const,
      verificationToken: 'mock-token',
      draft: null as SignupDraft | null,
    })
  }
  const { data } = await withRetry(() => confirmCodeFn({ email, code }))
  return data
}

export async function saveDraft(payload: DraftSave) {
  if (MOCK) return mock({ ok: true as const })
  const { data } = await withRetry(() => saveDraftFn(payload))
  return data
}

export async function submitSignup(payload: SignupSubmission) {
  if (MOCK) {
    const teamId =
      payload.team.choice === 'create' ? payload.team.name : payload.team.code
    return mock({ ok: true as const, teamId })
  }
  const { data } = await withRetry(() => submitSignupFn(payload))
  return data
}

export async function lookupTeam(code: string) {
  if (MOCK) return mock({ exists: true, memberCount: 1, isFull: false })
  const { data } = await withRetry(() => lookupTeamFn({ code }))
  return data
}

/**
 * Strips the "functions/" prefix Firebase puts on callable error codes, so
 * call sites can switch on the same codes used server-side (already-exists,
 * not-found, resource-exhausted, ...).
 */
export function errorCode(err: unknown): string {
  if (err instanceof FirebaseError) {
    return err.code.replace(/^functions\//, '')
  }
  return 'unknown'
}

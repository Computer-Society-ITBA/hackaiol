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
  { ok: true; verificationToken: string }
>(functions, 'hackaiolConfirmCode')

const submitSignupFn = httpsCallable<
  SignupSubmission,
  { ok: true; teamId: string | null }
>(functions, 'hackaiolSubmitSignup')

const lookupTeamFn = httpsCallable<{ code: string }, TeamLookupResult>(
  functions,
  'hackaiolLookupTeam',
)

export async function requestCode(email: string) {
  const { data } = await withRetry(() => requestCodeFn({ email }))
  return data
}

export async function confirmCode(email: string, code: string) {
  const { data } = await withRetry(() => confirmCodeFn({ email, code }))
  return data
}

export async function submitSignup(payload: SignupSubmission) {
  const { data } = await withRetry(() => submitSignupFn(payload))
  return data
}

export async function lookupTeam(code: string) {
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

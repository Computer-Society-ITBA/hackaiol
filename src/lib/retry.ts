import { FirebaseError } from 'firebase/app'

/** Total attempts, including the first one. */
const MAX_ATTEMPTS = 3

/** Wait before attempt 2 and before attempt 3, in milliseconds. */
const RETRY_DELAYS_MS = [1000, 3000]

/**
 * Fraction each delay is randomly stretched or shrunk by, so a room full of
 * people submitting at once does not line their retries up on one instant.
 */
const JITTER = 0.2

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const jittered = (ms: number) =>
  Math.round(ms * (1 + (Math.random() * 2 - 1) * JITTER))

/**
 * Whether a callable rejection means no response came back at all, as opposed
 * to the function answering with an error of its own.
 *
 * The SDK cannot tell a network failure from a backend one: a Cloud Run 500,
 * such as the scale-up rejection a cold function returns under load, never
 * gets a CORS header attached, so the browser rejects the fetch and the SDK
 * reports `internal` with no body to read. Those arrive with the message
 * defaulted to the bare code, while an `internal` a function raised on purpose
 * carries the message that function set.
 */
export function isRetryable(err: unknown): boolean {
  if (!(err instanceof FirebaseError)) return false
  if (err.code === 'functions/unavailable') return true
  return err.code === 'functions/internal' && err.message === 'internal'
}

/**
 * Runs a callable, retrying only failures that never reached the function.
 *
 * Anything the backend answered (a wrong code, an expired verification, a
 * duplicate signup) is thrown on the first attempt, so call sites keep
 * switching on the same error codes they always did.
 */
export async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call()
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) throw err
      await sleep(jittered(RETRY_DELAYS_MS[attempt - 1]))
    }
  }
}

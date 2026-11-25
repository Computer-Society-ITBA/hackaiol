import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { TapeTrack } from '@/components/landing/SignupCta'
import { emptyCode, isCodeComplete } from '@/components/signup/code'
import { TextField } from '@/components/signup/fields'
import {
  canLeaveTeamStep,
  emptyTeam,
  MAX_TEAM_SIZE,
  teamIdFrom,
  type TeamLookup,
  type TeamState,
} from '@/components/signup/team'
import { TeamStep } from '@/components/signup/TeamStep'
import { useResendCooldown } from '@/components/signup/useResendCooldown'
import { VerifyCodeInput } from '@/components/signup/VerifyCodeInput'
import {
  confirmCode,
  errorCode,
  lookupTeam,
  requestCode,
  saveDraft,
  submitSignup,
  type TeamChoicePayload,
} from '@/lib/signupApi'
import { tapeClasses } from '@/lib/tape'
import { cn } from '@/lib/utils'

const STEPS = ['email', 'verify', 'personal', 'socials', 'team'] as const
type StepId = (typeof STEPS)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// DNI or passport; passports can contain letters.
const ID_RE = /^[a-zA-Z0-9]{5,20}$/
const AGE_RE = /^\d{1,3}$/
const GRAD_YEAR_RE = /^\d{4}$/
const REQUIRED_PERSONAL = [
  'name',
  'dni',
  'age',
  'university',
  'location',
] as const

type Details = {
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
}

const emptyDetails: Details = {
  email: '',
  name: '',
  dni: '',
  age: '',
  university: '',
  major: '',
  gradYear: '',
  location: '',
  diet: '',
  github: '',
  linkedin: '',
  x: '',
  instagram: '',
  website: '',
}

type FieldErrors = Partial<Record<keyof Details, string>>

// Steps saved server-side as the visitor moves past them, so an unfinished
// sign-up can be resumed. Mirrors STEP_FIELDS in functions/src/drafts.ts.
const DRAFT_FIELDS = {
  personal: [
    'name',
    'dni',
    'age',
    'university',
    'major',
    'gradYear',
    'location',
    'diet',
  ],
  socials: ['github', 'linkedin', 'x', 'instagram', 'website'],
} as const satisfies Partial<Record<StepId, readonly (keyof Details)[]>>

type DraftStepId = keyof typeof DRAFT_FIELDS

const AUTOSAVE_DELAY_MS = 1200

const teamDraft = (team: TeamState) => ({
  teamChoice: team.choice ?? '',
  teamName: team.name,
  teamCode: team.code,
})

function teamFromDraft(data: Record<string, string>): TeamState | null {
  const choice = data.teamChoice
  if (choice !== 'join' && choice !== 'create') return null
  return { choice, name: data.teamName ?? '', code: data.teamCode ?? '' }
}

function teamPayload(team: TeamState): TeamChoicePayload {
  if (team.choice === 'create') return { choice: 'create', name: team.name }
  return { choice: 'join', code: team.code }
}

export function SignupForm() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<Details>(emptyDetails)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [code, setCode] = useState(emptyCode)
  const [codeError, setCodeError] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  )
  const [team, setTeam] = useState<TeamState>(emptyTeam)
  const [teamError, setTeamError] = useState('')
  // Keyed by slug so a result for an older code is never shown for the
  // current one.
  const [lookupResult, setLookupResult] = useState<{
    slug: string
    lookup: TeamLookup | null
  } | null>(null)
  const [busy, setBusy] = useState<'code' | 'save' | 'submit' | null>(null)
  const [done, setDone] = useState(false)
  // Step the form reopened on from a saved draft, to say so there.
  const [resumedAt, setResumedAt] = useState<number | null>(null)
  // Where to land after re-verifying when the verification lapsed mid-form.
  const returnStep = useRef<number | null>(null)
  const lastSavedTeam = useRef(JSON.stringify(teamDraft(emptyTeam)))

  const current: StepId = STEPS[step]
  const { cooldown, reset: resetCooldown } = useResendCooldown(
    current === 'verify',
  )

  const lookupSlug = team.choice === 'join' ? teamIdFrom(team.code) : ''
  const lookupActive = lookupSlug.length >= 4
  const teamLookupLoading = lookupActive && lookupResult?.slug !== lookupSlug
  const teamLookup =
    lookupActive && lookupResult?.slug === lookupSlug
      ? lookupResult.lookup
      : null

  useEffect(() => {
    if (lookupSlug.length < 4) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      lookupTeam(lookupSlug)
        .catch(() => null)
        .then((lookup) => {
          if (!cancelled) setLookupResult({ slug: lookupSlug, lookup })
        })
    }, 400)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [lookupSlug])

  // The team step is the last one, so there is no "continue" to save it
  // on: it is saved as it is chosen. Nothing is reserved until the submit.
  const { email } = details
  useEffect(() => {
    if (current !== 'team' || !verificationToken || done) return
    const data = teamDraft(team)
    const snapshot = JSON.stringify(data)
    if (snapshot === lastSavedTeam.current) return
    const handle = window.setTimeout(() => {
      lastSavedTeam.current = snapshot
      // Best-effort: the submit carries the team choice regardless.
      saveDraft({
        email: email.trim(),
        verificationToken,
        step: 'team',
        data,
      }).catch(() => {
        lastSavedTeam.current = ''
      })
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(handle)
  }, [current, verificationToken, done, email, team])

  const set = (key: keyof Details) => (value: string) => {
    setDetails((d) => ({ ...d, [key]: value }))
    setErrors((errs) => {
      if (!errs[key]) return errs
      const next = { ...errs }
      delete next[key]
      return next
    })
  }

  const field = (key: keyof Details, optional = false) => ({
    label: t(`signup.fields.${key}`),
    value: details[key],
    onChange: set(key),
    optional,
    error: errors[key],
  })

  const restartVerification = () => {
    returnStep.current = null
    setVerificationToken(null)
    setCode(emptyCode)
    setCodeError('')
    setStep(0)
  }

  // The verification lapsed mid-form: confirm a new code, then come back
  // to the step being left, with everything typed still in place.
  const reverify = () => {
    restartVerification()
    returnStep.current = step
    setErrors({ email: t('signup.validation.verificationExpired') })
  }

  /**
   * Saves the step being left. Returns false only when the visitor can't
   * move on; a plain network failure doesn't hold them back, since the
   * final submit carries every field anyway.
   */
  const saveStep = async (id: DraftStepId): Promise<boolean> => {
    if (!verificationToken) {
      reverify()
      return false
    }
    setBusy('save')
    try {
      await saveDraft({
        email: details.email.trim(),
        verificationToken,
        step: id,
        data: Object.fromEntries(
          DRAFT_FIELDS[id].map((key) => [key, details[key].trim()]),
        ),
      })
    } catch (err) {
      if (errorCode(err) === 'failed-precondition') {
        reverify()
        return false
      }
    } finally {
      setBusy(null)
    }
    return true
  }

  const validatePersonal = (): boolean => {
    const required = t('signup.validation.required')
    const next: FieldErrors = {}
    for (const key of REQUIRED_PERSONAL) {
      if (!details[key].trim()) next[key] = required
    }
    if (!next.dni && !ID_RE.test(details.dni.trim()))
      next.dni = t('signup.validation.invalidId')
    if (!next.age && !AGE_RE.test(details.age.trim()))
      next.age = t('signup.validation.numeric')
    if (details.gradYear.trim() && !GRAD_YEAR_RE.test(details.gradYear.trim()))
      next.gradYear = t('signup.validation.year')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const sendCode = async () => {
    setBusy('code')
    try {
      await requestCode(details.email.trim())
      resetCooldown()
      setCode(emptyCode)
      setCodeError('')
      return true
    } catch (err) {
      const errCode = errorCode(err)
      const message =
        errCode === 'already-exists'
          ? t('signup.validation.emailTaken')
          : errCode === 'resource-exhausted'
            ? t('signup.validation.tooManyAttempts')
            : t('signup.validation.submitFailed')
      if (current === 'email') setErrors({ email: message })
      else setCodeError(message)
      return false
    } finally {
      setBusy(null)
    }
  }

  const verify = async () => {
    if (!isCodeComplete(code)) {
      setCodeError(t('signup.validation.code'))
      return
    }
    setBusy('code')
    try {
      const result = await confirmCode(details.email.trim(), code)
      setVerificationToken(result.verificationToken)
      let next = step + 1
      const draft = result.draft
      if (draft) {
        // Anything already typed in this session is newer than the save.
        const typed = Object.fromEntries(
          Object.entries(details).filter(([, value]) => value.trim()),
        )
        const saved = Object.fromEntries(
          Object.entries(draft.data).filter(
            ([key]) => key in emptyDetails && key !== 'email',
          ),
        )
        const restored: Details = { ...emptyDetails, ...saved, ...typed }
        setDetails(restored)
        const savedTeam = teamFromDraft(draft.data)
        if (savedTeam && team.choice === null) {
          setTeam(savedTeam)
          lastSavedTeam.current = JSON.stringify(teamDraft(savedTeam))
        }
        // A draft missing a required field is not past the personal step.
        const personalComplete = REQUIRED_PERSONAL.every((key) =>
          restored[key].trim(),
        )
        if (draft.lastCompletedStep && personalComplete) {
          next = STEPS.indexOf(draft.lastCompletedStep) + 1
        }
      }
      if (returnStep.current !== null) {
        next = returnStep.current
        returnStep.current = null
      } else if (draft) {
        setResumedAt(next)
      }
      setStep(next)
    } catch (err) {
      const errCode = errorCode(err)
      if (errCode === 'deadline-exceeded' || errCode === 'not-found') {
        setCodeError(t('signup.validation.codeExpired'))
      } else if (errCode === 'resource-exhausted') {
        setCodeError(t('signup.validation.tooManyAttempts'))
      } else {
        setCodeError(t('signup.validation.codeInvalid'))
      }
    } finally {
      setBusy(null)
    }
  }

  const submit = async () => {
    if (!canLeaveTeamStep(team, teamLookup)) {
      setTeamError(t('signup.validation.team'))
      return
    }
    if (!verificationToken) {
      restartVerification()
      return
    }
    setTeamError('')
    setBusy('submit')
    try {
      const trimmed = Object.fromEntries(
        Object.entries(details).map(([k, v]) => [k, v.trim()]),
      ) as Details
      await submitSignup({
        ...trimmed,
        verificationToken,
        team: teamPayload(team),
      })
      setDone(true)
    } catch (err) {
      const errCode = errorCode(err)
      if (errCode === 'failed-precondition') {
        reverify()
      } else if (errCode === 'already-exists') {
        setTeamError(
          team.choice === 'create'
            ? t('signup.validation.teamCodeTaken')
            : t('signup.validation.emailTaken'),
        )
      } else if (errCode === 'not-found') {
        setTeamError(t('signup.validation.teamNotFound'))
      } else if (errCode === 'resource-exhausted') {
        setTeamError(t('signup.team.join.full', { max: MAX_TEAM_SIZE }))
      } else {
        setTeamError(t('signup.validation.submitFailed'))
      }
    } finally {
      setBusy(null)
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return

    if (current === 'email') {
      const email = details.email.trim()
      if (!email) return setErrors({ email: t('signup.validation.required') })
      if (!EMAIL_RE.test(email))
        return setErrors({ email: t('signup.validation.email') })
      setErrors({})
      if (await sendCode()) setStep(1)
      return
    }
    if (current === 'verify') return verify()
    if (current === 'personal') {
      if (validatePersonal() && (await saveStep('personal'))) {
        setStep((s) => s + 1)
      }
      return
    }
    if (current === 'socials') {
      if (await saveStep('socials')) setStep((s) => s + 1)
      return
    }
    return submit()
  }

  if (done) {
    return (
      <div className="py-4">
        <h1 className="type-title">{t('signup.success.title')}</h1>
        <p className="type-body text-brand-text-dim mt-2 max-w-md">
          {t('signup.success.desc')}
        </p>
        <Link to="/" className="btn-secondary mt-8">
          {t('signup.backHome')}
        </Link>
      </div>
    )
  }

  const canGoBack = step > 0 && current !== 'personal'
  const submitLabel =
    busy === 'submit'
      ? t('signup.team.submitting')
      : t(`signup.${current}.submit`)

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="mb-10">
        <div className="mb-6 flex h-9 items-center justify-between gap-4">
          <div
            role="img"
            aria-label={t('signup.stepOf', {
              current: step + 1,
              total: STEPS.length,
            })}
            className="flex items-center gap-1.5"
          >
            {STEPS.map((id, i) => (
              <span
                key={id}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === step
                    ? 'bg-brand-green w-6'
                    : i < step
                      ? 'bg-brand-green/60 w-1.5'
                      : 'w-1.5 bg-white/20',
                )}
              />
            ))}
          </div>
          {canGoBack && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="group btn-secondary pl-2.5"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
              {t('signup.back')}
            </button>
          )}
        </div>
        <h1 className="type-title">{t(`signup.${current}.title`)}</h1>
        <p className="type-body text-brand-text-dim mt-2 break-words">
          {t(`signup.${current}.desc`, {
            email: details.email.trim(),
            max: MAX_TEAM_SIZE,
          })}
        </p>
        {resumedAt === step && (
          <p role="status" className="type-small text-brand-green mt-3">
            {t('signup.resumed')}
          </p>
        )}
      </div>

      {current === 'email' && (
        <TextField
          {...field('email')}
          type="email"
          autoComplete="email"
          onChange={(value) => {
            set('email')(value)
            setVerificationToken(null)
          }}
        />
      )}

      {current === 'verify' && (
        <>
          <VerifyCodeInput
            value={code}
            onChange={(value) => {
              setCode(value)
              if (codeError) setCodeError('')
            }}
            label={t('signup.verify.codeLabel')}
            error={codeError}
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={cooldown > 0 || busy !== null}
              onClick={sendCode}
              className="btn-secondary"
            >
              {cooldown > 0
                ? t('signup.verify.resendIn', { seconds: cooldown })
                : t('signup.verify.resend')}
            </button>
            <button
              type="button"
              onClick={restartVerification}
              className="btn-secondary"
            >
              {t('signup.verify.changeEmail')}
            </button>
          </div>
        </>
      )}

      {current === 'personal' && (
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
          <TextField
            {...field('name')}
            autoComplete="name"
            className="sm:col-span-2"
          />
          <TextField
            {...field('dni')}
            placeholder={t('signup.placeholders.dni')}
          />
          <TextField {...field('age')} inputMode="numeric" />
          <TextField {...field('university')} className="sm:col-span-2" />
          <TextField {...field('major', true)} />
          <TextField
            {...field('gradYear', true)}
            inputMode="numeric"
            placeholder={t('signup.placeholders.gradYear')}
          />
          <TextField
            {...field('location')}
            placeholder={t('signup.placeholders.location')}
            className="sm:col-span-2"
          />
          <TextField
            {...field('diet', true)}
            placeholder={t('signup.placeholders.diet')}
            className="sm:col-span-2"
          />
        </div>
      )}

      {current === 'socials' && (
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
          <TextField
            {...field('github')}
            placeholder={t('signup.placeholders.github')}
          />
          <TextField
            {...field('linkedin')}
            placeholder={t('signup.placeholders.linkedin')}
          />
          <TextField
            {...field('x')}
            placeholder={t('signup.placeholders.handle')}
          />
          <TextField
            {...field('instagram')}
            placeholder={t('signup.placeholders.handle')}
          />
          <TextField
            {...field('website')}
            type="url"
            placeholder={t('signup.placeholders.website')}
            className="sm:col-span-2"
          />
        </div>
      )}

      {current === 'team' && (
        <TeamStep
          value={team}
          onChange={(next) => {
            setTeam(next)
            if (teamError) setTeamError('')
          }}
          error={teamError}
          lookup={teamLookup}
          lookupLoading={teamLookupLoading}
        />
      )}

      <div className="mt-6 flex flex-col items-start gap-5">
        <button
          type="submit"
          disabled={busy !== null}
          aria-busy={busy !== null}
          aria-label={submitLabel}
          className={cn(
            tapeClasses,
            'focus-visible:ring-brand-green/50 h-12 w-60 -rotate-1 text-base outline-none focus-visible:rotate-0 focus-visible:ring-[3px] disabled:cursor-wait disabled:opacity-60 sm:h-14 sm:w-64 sm:text-lg',
          )}
        >
          <TapeTrack key={submitLabel} label={submitLabel} />
        </button>
        {current === 'team' && (
          <p className="type-small text-brand-text-dim max-w-md">
            {t('signup.consent')}
          </p>
        )}
      </div>
    </form>
  )
}

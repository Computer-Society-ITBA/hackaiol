import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
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
  submitSignup,
  type TeamChoicePayload,
} from '@/lib/signupApi'

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
  const [busy, setBusy] = useState<'code' | 'submit' | null>(null)
  const [done, setDone] = useState(false)

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
    setVerificationToken(null)
    setCode(emptyCode)
    setCodeError('')
    setStep(0)
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
      setStep((s) => s + 1)
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
        restartVerification()
        setErrors({ email: t('signup.validation.verificationExpired') })
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
      if (validatePersonal()) setStep((s) => s + 1)
      return
    }
    if (current === 'socials') return setStep((s) => s + 1)
    return submit()
  }

  if (done) {
    return (
      <div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          {t('signup.success.title')}
        </h1>
        <p className="text-muted-foreground">{t('signup.success.desc')}</p>
      </div>
    )
  }

  const canGoBack = step > 0 && current !== 'personal'

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="mb-2">
        <div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
          <span>
            {t('signup.stepOf', { current: step + 1, total: STEPS.length })}
          </span>
          {canGoBack && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="hover:text-foreground transition-colors"
            >
              {t('signup.back')}
            </button>
          )}
        </div>
        <div className="bg-border mb-6 h-0.5 w-full rounded-full">
          <div
            className="bg-primary h-0.5 rounded-full transition-[width] duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          {t(`signup.${current}.title`)}
        </h1>
        <p className="text-muted-foreground break-words">
          {t(`signup.${current}.desc`, {
            email: details.email.trim(),
            max: MAX_TEAM_SIZE,
          })}
        </p>
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
          <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <button
              type="button"
              disabled={cooldown > 0 || busy !== null}
              onClick={sendCode}
              className="hover:text-foreground underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0
                ? t('signup.verify.resendIn', { seconds: cooldown })
                : t('signup.verify.resend')}
            </button>
            <button
              type="button"
              onClick={restartVerification}
              className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
            >
              {t('signup.verify.changeEmail')}
            </button>
          </div>
        </>
      )}

      {current === 'personal' && (
        <div className="grid gap-5 sm:grid-cols-2">
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
        <div className="grid gap-5 sm:grid-cols-2">
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

      <div className="mt-2 flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={busy !== null}
          aria-busy={busy !== null}
          className="w-full"
        >
          {busy === 'submit'
            ? t('signup.team.submitting')
            : t(`signup.${current}.submit`)}
        </Button>
        {current === 'team' && (
          <p className="text-muted-foreground text-center text-xs">
            {t('signup.consent')}
          </p>
        )}
      </div>
    </form>
  )
}

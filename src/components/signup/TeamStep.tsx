import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FieldError, TextField } from '@/components/signup/fields'
import {
  MAX_TEAM_SIZE,
  emptyTeam,
  teamIdFrom,
  type TeamChoice,
  type TeamLookup,
  type TeamState,
} from '@/components/signup/team'
import { cn } from '@/lib/utils'

const CHOICES: TeamChoice[] = ['join', 'create']

export function TeamStep({
  value,
  onChange,
  error,
  lookup,
  lookupLoading,
}: {
  value: TeamState
  onChange: (next: TeamState) => void
  error?: string
  lookup: TeamLookup | null
  lookupLoading: boolean
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const generatedId = teamIdFrom(value.name)
  const lookupCode = teamIdFrom(value.code)
  const showLookup = lookupCode.length >= 4 && !lookupLoading

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(generatedId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset aria-describedby={error ? 'team-error' : undefined}>
        <legend className="sr-only">{t('signup.steps.team')}</legend>
        <div className="flex flex-col gap-2">
          {CHOICES.map((choice) => {
            const selected = value.choice === choice
            return (
              <label
                key={choice}
                className={cn(
                  'has-focus-visible:ring-ring/25 cursor-pointer rounded-xl border px-4 py-3 transition-colors has-focus-visible:ring-[3px]',
                  selected
                    ? 'border-brand-green bg-brand-green/10'
                    : 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]',
                )}
              >
                <input
                  type="radio"
                  name="team-choice"
                  value={choice}
                  checked={selected}
                  onChange={() =>
                    onChange({ ...emptyTeam, choice, name: value.name })
                  }
                  className="sr-only"
                />
                <span className="type-heading block">
                  {t(`signup.team.choices.${choice}.title`)}
                </span>
                <span className="type-small text-brand-text-dim block">
                  {t(`signup.team.choices.${choice}.desc`)}
                </span>
              </label>
            )
          })}
        </div>
        <FieldError id="team-error" message={error} />
      </fieldset>

      {value.choice === 'create' && (
        <div className="flex flex-col gap-4">
          <TextField
            label={t('signup.fields.teamName')}
            value={value.name}
            onChange={(name) => onChange({ ...value, name })}
          />
          {generatedId && (
            <div>
              {/* A coupon with the code, dashed like the pass's stub. */}
              <div className="border-brand-green/50 bg-brand-green/[0.06] flex items-center justify-between gap-4 rounded-xl border border-dashed py-4 pr-4 pl-5">
                <div className="min-w-0">
                  <p className="type-eyebrow text-brand-green">
                    {t('signup.team.create.codeLabel')}
                  </p>
                  <code className="type-title mt-1 block truncate font-mono tracking-wide">
                    {generatedId}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={copyId}
                  className="btn-secondary flex-shrink-0"
                >
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {copied ? (
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                    ) : (
                      <>
                        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                        <path d="M10.5 3.5v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" />
                      </>
                    )}
                  </svg>
                  {copied
                    ? t('signup.team.create.copied')
                    : t('signup.team.create.copy')}
                </button>
              </div>
              <p className="type-small text-brand-text-dim mt-2 mb-3">
                {t('signup.team.create.hint', { max: MAX_TEAM_SIZE })}
              </p>
            </div>
          )}
        </div>
      )}

      {value.choice === 'join' && (
        <TextField
          label={t('signup.fields.teamCode')}
          value={value.code}
          onChange={(code) => onChange({ ...value, code })}
          hint={
            lookupLoading ? (
              t('signup.team.join.checking')
            ) : showLookup && lookup && !lookup.exists ? (
              <span className="text-destructive">
                {t('signup.validation.teamNotFound')}
              </span>
            ) : showLookup && lookup?.exists ? (
              <span className={lookup.isFull ? 'text-destructive' : undefined}>
                {lookup.isFull
                  ? t('signup.team.join.full', { max: MAX_TEAM_SIZE })
                  : t('signup.team.join.members', {
                      taken: lookup.memberCount,
                      max: MAX_TEAM_SIZE,
                    })}
              </span>
            ) : undefined
          }
        />
      )}
    </div>
  )
}

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
    <div className="flex flex-col gap-5">
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
                <span className="block font-semibold">
                  {t(`signup.team.choices.${choice}.title`)}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {t(`signup.team.choices.${choice}.desc`)}
                </span>
              </label>
            )
          })}
        </div>
        <FieldError id="team-error" message={error} />
      </fieldset>

      {value.choice === 'create' && (
        <div className="flex flex-col gap-3">
          <TextField
            label={t('signup.fields.teamName')}
            value={value.name}
            onChange={(name) => onChange({ ...value, name })}
          />
          {generatedId && (
            <div className="border-brand-green/40 bg-brand-green/[0.07] rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-sm">
                    {t('signup.team.create.codeLabel')}
                  </p>
                  <code className="text-brand-green block truncate font-mono text-lg font-semibold">
                    {generatedId}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={copyId}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0 text-sm underline-offset-4 transition-colors hover:underline"
                >
                  {copied
                    ? t('signup.team.create.copied')
                    : t('signup.team.create.copy')}
                </button>
              </div>
              <p className="text-muted-foreground mt-2 text-sm">
                {t('signup.team.create.hint', { max: MAX_TEAM_SIZE })}
              </p>
            </div>
          )}
        </div>
      )}

      {value.choice === 'join' && (
        <div className="flex flex-col gap-2">
          <TextField
            label={t('signup.fields.teamCode')}
            value={value.code}
            onChange={(code) => onChange({ ...value, code })}
          />
          {lookupLoading && (
            <p className="text-muted-foreground text-sm">
              {t('signup.team.join.checking')}
            </p>
          )}
          {showLookup && lookup && !lookup.exists && (
            <p className="text-destructive text-sm">
              {t('signup.validation.teamNotFound')}
            </p>
          )}
          {showLookup && lookup?.exists && (
            <p
              className={cn(
                'text-sm',
                lookup.isFull ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {lookup.isFull
                ? t('signup.team.join.full', { max: MAX_TEAM_SIZE })
                : t('signup.team.join.members', {
                    taken: lookup.memberCount,
                    max: MAX_TEAM_SIZE,
                  })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

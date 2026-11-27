import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useAdmin } from '@/components/admin/context'
import { useDateFormat } from '@/components/admin/format'
import { PARTICIPANT_FIELDS, type Participant } from '@/components/admin/model'
import {
  CloseButton,
  INPUT_CLASSES,
  Segmented,
  StatusPill,
} from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import {
  SIGNUP_STATUSES,
  moveSignup,
  setSignupStatus,
  type SignupStatus,
  type TeamTarget,
} from '@/lib/adminApi'
import { cn } from '@/lib/utils'

const NO_TEAM = ''
const NEW_TEAM = '__new__'

const DETAIL_FIELDS = PARTICIPANT_FIELDS.filter(
  (field) => field !== 'name' && field !== 'status',
)

function asLink(value: string): string | null {
  return /^https?:\/\//i.test(value) ? value : null
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 px-6 py-5">
      <h3 className="mb-3 text-base leading-6 font-semibold text-white">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Side panel with every field of one participant, status and team. */
export function ParticipantPanel({
  participant: p,
  onClose,
}: {
  participant: Participant
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { data, participants, busy, run } = useAdmin()
  const formatDate = useDateFormat()
  const baseId = useId()
  const [target, setTarget] = useState(p.teamId ?? NO_TEAM)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const members = p.team
    ? participants.filter((other) => other.teamId === p.teamId)
    : []
  const teams = [...data.teams].sort((a, b) => a.name.localeCompare(b.name))
  const unchanged = target === (p.teamId ?? NO_TEAM)
  const canMove =
    !busy && !unchanged && (target !== NEW_TEAM || newName.trim().length > 0)

  const setStatus = (status: SignupStatus) =>
    void run(
      () => setSignupStatus([p.email], status),
      t('admin.notices.statusOne', {
        name: p.name,
        status: t(`admin.status.${status}`).toLowerCase(),
      }),
    )

  // The page keys this panel by email and team, so a successful move
  // remounts it with the form reset to the new team.
  const move = () => {
    const to: TeamTarget =
      target === NEW_TEAM
        ? { newTeamName: newName.trim() }
        : { teamId: target || null }
    void run(
      () => moveSignup(p.email, to),
      t('admin.notices.moved', { name: p.name }),
    )
  }

  const details: { label: string; value: string; field?: string }[] = [
    { label: t('admin.fields.createdAt'), value: formatDate(p.createdAt) },
    ...DETAIL_FIELDS.map((field) => ({
      label: t(`admin.fields.${field}`),
      value:
        field === 'teamChoice' && p[field]
          ? t(`admin.teamChoice.${p[field]}`, { defaultValue: p[field] })
          : (p[field] ?? ''),
      field,
    })),
  ]

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label={t('admin.close')}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#1a0d40] shadow-2xl"
      >
        <header className="flex items-start gap-3 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2
              id={`${baseId}-title`}
              className="truncate text-xl leading-7 font-bold text-white"
            >
              {p.name || p.email}
            </h2>
            <p className="text-brand-text-dim truncate text-sm leading-5">
              {p.email}
            </p>
          </div>
          <CloseButton onClick={onClose} className="-mt-0.5 -mr-2" />
        </header>

        <Section title={t('admin.fields.status')}>
          <Segmented
            label={t('admin.fields.status')}
            value={p.status}
            disabled={busy}
            onChange={setStatus}
            className="flex w-full"
            options={SIGNUP_STATUSES.map((status) => ({
              value: status,
              label: t(`admin.status.${status}`),
            }))}
          />
        </Section>

        <Section title={t('admin.participants.team')}>
          {p.team ? (
            <>
              <p className="text-sm leading-5 font-semibold text-white">
                {p.team.name}
              </p>
              <ul className="mt-2 space-y-1">
                {members.map((member) => (
                  <li
                    key={member.email}
                    className="flex h-8 items-center justify-between gap-3 text-sm leading-5"
                  >
                    <span
                      className={cn(
                        'truncate',
                        member.email === p.email
                          ? 'text-white'
                          : 'text-brand-text-dim',
                      )}
                    >
                      {member.name || member.email}
                    </span>
                    <StatusPill status={member.status} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-brand-orange text-sm leading-5">
              {t('admin.teams.none')}
            </p>
          )}

          <label
            htmlFor={`${baseId}-team`}
            className="text-brand-text-dim mt-5 mb-2 block text-sm leading-5"
          >
            {t('admin.participants.moveTo')}
          </label>
          <div className="flex gap-2">
            <select
              id={`${baseId}-team`}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={cn(INPUT_CLASSES, 'min-w-0 flex-1')}
            >
              <option value={NO_TEAM}>{t('admin.teams.none')}</option>
              <option value={NEW_TEAM}>
                {t('admin.participants.newTeam')}
              </option>
              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                  disabled={
                    team.memberCount >= data.maxTeamSize && team.id !== p.teamId
                  }
                >
                  {team.name} ({team.memberCount}/{data.maxTeamSize})
                </option>
              ))}
            </select>
            <Button disabled={!canMove} onClick={move}>
              {t('admin.participants.move')}
            </Button>
          </div>
          {target === NEW_TEAM && (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('admin.participants.newTeamName')}
              aria-label={t('admin.participants.newTeamName')}
              className={cn(INPUT_CLASSES, 'mt-2 w-full')}
            />
          )}
          {p.team && p.team.memberCount === 1 && !unchanged && (
            <p className="text-brand-orange mt-2 text-xs leading-4">
              {t('admin.participants.lastMemberHint')}
            </p>
          )}
        </Section>

        <Section title={t('admin.participants.details')}>
          <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-5">
            {details.map(({ label, value, field }) => {
              const href = asLink(value)
              return (
                <div key={field ?? label} className="contents">
                  <dt className="text-brand-text-dim">{label}</dt>
                  <dd className="break-words text-white">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-green underline-offset-2 hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      value || <span className="text-white/30">-</span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </Section>
      </aside>
    </div>
  )
}

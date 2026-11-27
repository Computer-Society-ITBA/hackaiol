import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { useAdmin } from '@/components/admin/context'
import { normalize, type Participant } from '@/components/admin/model'
import {
  INPUT_CLASSES,
  PageHeader,
  ROW_INPUT_CLASSES,
  SURFACE_CLASSES,
  StatusPill,
} from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import {
  deleteTeam,
  renameTeam,
  setSignupStatus,
  type AdminTeam,
  type SignupStatus,
} from '@/lib/adminApi'
import { cn } from '@/lib/utils'

const SIZE_FILTERS = ['', 'full', 'incomplete'] as const
type SizeFilter = (typeof SIZE_FILTERS)[number]

const STATUS_FILTERS = ['', 'allAccepted', 'anyPending', 'anyRejected'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

type TeamRow = AdminTeam & { members: Participant[] }

function matchesStatus(members: Participant[], filter: StatusFilter): boolean {
  switch (filter) {
    case '':
      return true
    case 'allAccepted':
      return members.length > 0 && members.every((m) => m.status === 'accepted')
    case 'anyPending':
      return members.some((m) => m.status === 'pending')
    case 'anyRejected':
      return members.some((m) => m.status === 'rejected')
  }
}

export default function AdminTeamsPage() {
  const { t } = useTranslation()
  const { data, participants, busy, run } = useAdmin()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  )

  const query = params.get('q') ?? ''
  const size = (params.get('size') ?? '') as SizeFilter
  const statusFilter = (params.get('status') ?? '') as StatusFilter

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const rows = useMemo<TeamRow[]>(() => {
    const byTeam = new Map<string, Participant[]>()
    for (const p of participants) {
      if (!p.teamId) continue
      const list = byTeam.get(p.teamId) ?? []
      list.push(p)
      byTeam.set(p.teamId, list)
    }
    return [...data.teams]
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .map((team) => ({ ...team, members: byTeam.get(team.id) ?? [] }))
  }, [data.teams, participants])

  const visible = useMemo(() => {
    const q = normalize(query)
    return rows.filter((team) => {
      const full = team.members.length >= data.maxTeamSize
      if (size === 'full' && !full) return false
      if (size === 'incomplete' && full) return false
      if (!matchesStatus(team.members, statusFilter)) return false
      if (!q) return true
      return [
        team.name,
        ...team.members.flatMap((m) => [m.name, m.email, m.university]),
      ].some((value) => normalize(value).includes(q))
    })
  }, [rows, query, size, statusFilter, data.maxTeamSize])

  const loose = participants.filter((p) => !p.team).length
  const fullCount = rows.filter(
    (r) => r.members.length >= data.maxTeamSize,
  ).length

  const saveName = async () => {
    if (!editing) return
    const ok = await run(
      () => renameTeam(editing.id, editing.name.trim()),
      t('admin.notices.renamed', { name: editing.name.trim() }),
    )
    if (ok) setEditing(null)
  }

  const remove = (team: TeamRow) => {
    const confirmed = window.confirm(
      t('admin.teams.confirmDelete', {
        name: team.name,
        count: team.members.length,
      }),
    )
    if (!confirmed) return
    void run(
      () => deleteTeam(team.id),
      t('admin.notices.deleted', { name: team.name }),
    )
  }

  const setTeamStatus = (team: TeamRow, status: SignupStatus) =>
    void run(
      () =>
        setSignupStatus(
          team.members.map((m) => m.email),
          status,
        ),
      t('admin.notices.statusMany', {
        count: team.members.length,
        status: t(`admin.status.${status}`).toLowerCase(),
      }),
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.nav.teams')}
        summary={t('admin.teams.summary', {
          total: rows.length,
          full: fullCount,
          count: loose,
        })}
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => set('q', e.target.value)}
          placeholder={t('admin.teams.search')}
          aria-label={t('admin.teams.search')}
          className={cn(INPUT_CLASSES, 'min-w-56 flex-1')}
        />
        <select
          value={size}
          onChange={(e) => set('size', e.target.value)}
          aria-label={t('admin.teams.size')}
          className={cn(INPUT_CLASSES, 'w-full sm:w-44')}
        >
          {SIZE_FILTERS.map((value) => (
            <option key={value} value={value}>
              {t(`admin.teams.sizeFilter.${value || 'all'}`)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => set('status', e.target.value)}
          aria-label={t('admin.fields.status')}
          className={cn(INPUT_CLASSES, 'w-full sm:w-44')}
        >
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {t(`admin.teams.statusFilter.${value || 'all'}`)}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p
          className={cn(
            SURFACE_CLASSES,
            'text-brand-text-dim px-4 py-12 text-center text-sm leading-5',
          )}
        >
          {t('admin.teams.empty')}
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visible.map((team) => {
            const full = team.members.length >= data.maxTeamSize
            const isEditing = editing?.id === team.id
            return (
              // The member list grows to fill the card, which pins the
              // action row to the bottom edge: cards side by side keep
              // their actions on one line.
              <li
                key={team.id}
                className={cn(SURFACE_CLASSES, 'flex flex-col p-4')}
              >
                {isEditing ? (
                  <form
                    className="flex h-8 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void saveName()
                    }}
                  >
                    <input
                      autoFocus
                      value={editing.name}
                      onChange={(e) =>
                        setEditing({ id: team.id, name: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      aria-label={t('admin.teams.newName')}
                      className={cn(ROW_INPUT_CLASSES, 'min-w-0 flex-1')}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={busy || !editing.name.trim()}
                    >
                      {t('admin.save')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
                      {t('admin.cancel')}
                    </Button>
                  </form>
                ) : (
                  <div className="flex h-8 items-center gap-3">
                    <h2 className="min-w-0 flex-1 truncate text-base leading-6 font-semibold text-white">
                      {team.name}
                    </h2>
                    <span
                      className={cn(
                        'text-sm leading-5 tabular-nums',
                        full ? 'text-brand-green' : 'text-brand-orange',
                      )}
                    >
                      {team.members.length}/{data.maxTeamSize}
                    </span>
                  </div>
                )}

                <ul className="mt-3 flex-1 space-y-1">
                  {team.members.map((m) => (
                    <li
                      key={m.email}
                      className="flex h-8 items-center justify-between gap-3 text-sm leading-5"
                    >
                      <Link
                        to={`/admin/participants?open=${encodeURIComponent(m.email)}`}
                        className="min-w-0 truncate text-white hover:underline"
                      >
                        {m.name || m.email}
                      </Link>
                      <StatusPill status={m.status} />
                    </li>
                  ))}
                  {team.members.length === 0 && (
                    <li className="text-brand-orange flex h-8 items-center text-sm leading-5">
                      {t('admin.teams.noMembers')}
                    </li>
                  )}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || isEditing || team.members.length === 0}
                    onClick={() => setTeamStatus(team, 'accepted')}
                  >
                    {t('admin.teams.acceptAll')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || isEditing || team.members.length === 0}
                    onClick={() => setTeamStatus(team, 'rejected')}
                  >
                    {t('admin.teams.rejectAll')}
                  </Button>
                  <span className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || isEditing}
                      onClick={() =>
                        setEditing({ id: team.id, name: team.name })
                      }
                    >
                      {t('admin.teams.rename')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || isEditing}
                      onClick={() => remove(team)}
                      className="text-destructive hover:text-destructive"
                    >
                      {t('admin.teams.delete')}
                    </Button>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

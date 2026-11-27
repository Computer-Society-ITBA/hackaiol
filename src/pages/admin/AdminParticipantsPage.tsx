import { Fragment, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { ParticipantPanel } from '@/components/admin/ParticipantPanel'
import { useAdmin } from '@/components/admin/context'
import { copyText, useDateFormat } from '@/components/admin/format'
import {
  FILTER_FIELDS,
  FILTER_OPS,
  decodeFilter,
  downloadParticipantsCsv,
  encodeFilter,
  filterParticipants,
  groupByTeam,
  type Filter,
  type Participant,
} from '@/components/admin/model'
import {
  INPUT_CLASSES,
  PageHeader,
  ROW_INPUT_CLASSES,
  SURFACE_CLASSES,
  Segmented,
} from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import {
  SIGNUP_STATUSES,
  setSignupStatus,
  type SignupStatus,
} from '@/lib/adminApi'
import { cn } from '@/lib/utils'

const COLUMN_COUNT = 7

// Every cell shares the same horizontal padding, so headers, member
// rows and team rows start their text on the same vertical lines.
const CELL = 'px-3 align-middle'
const HEAD = cn(CELL, 'h-10 text-xs leading-4 font-semibold')
const CHECKBOX = 'accent-brand-green block size-4'

const TOGGLE_ACTIVE = 'bg-white/15 text-white hover:bg-white/15'

export default function AdminParticipantsPage() {
  const { t } = useTranslation()
  const { data, participants, busy, run, notify } = useAdmin()
  const formatDate = useDateFormat()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())

  // Filters live in the URL, so a filtered view survives a reload, moving
  // between screens and can be shared with another organizer.
  const status = params.get('status') ?? ''
  const query = params.get('q') ?? ''
  const grouped = params.get('group') === '1'
  const openEmail = params.get('open')
  const filters = useMemo(
    () =>
      params
        .getAll('f')
        .map(decodeFilter)
        .filter((filter): filter is Filter => filter !== null),
    [params],
  )

  // Starts from the live URL: the router's own `prev` can be a render
  // behind, which would drop a param set by the previous click.
  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(window.location.search)
      mutate(next)
      setParams(next, { replace: true })
    },
    [setParams],
  )

  const setFilters = (next: Filter[]) =>
    update((p) => {
      p.delete('f')
      for (const filter of next) p.append('f', encodeFilter(filter))
    })
  const patchFilter = (index: number, patch: Partial<Filter>) =>
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)))

  const withoutStatus = useMemo(
    () => filterParticipants(participants, { status: '', query, filters }),
    [participants, query, filters],
  )
  const visible = useMemo(
    () =>
      status ? withoutStatus.filter((p) => p.status === status) : withoutStatus,
    [withoutStatus, status],
  )
  const counts = useMemo(() => {
    const result: Record<string, number> = { '': withoutStatus.length }
    for (const s of SIGNUP_STATUSES) result[s] = 0
    for (const p of withoutStatus)
      result[p.status] = (result[p.status] ?? 0) + 1
    return result
  }, [withoutStatus])
  const groups = useMemo(
    () => (grouped ? groupByTeam(visible) : null),
    [grouped, visible],
  )
  const open = openEmail
    ? participants.find((p) => p.email === openEmail)
    : undefined
  const closePanel = useCallback(
    () => update((p) => p.delete('open')),
    [update],
  )

  const visibleEmails = visible.map((p) => p.email)
  const selectedVisible = visibleEmails.filter((email) => selected.has(email))
  const allSelected =
    visible.length > 0 && selectedVisible.length === visible.length
  const hasFilters = filters.length > 0 || query !== '' || status !== ''

  const setMany = (emails: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const email of emails) {
        if (on) next.add(email)
        else next.delete(email)
      }
      return next
    })

  const applyStatus = async (emails: string[], to: SignupStatus) => {
    const ok = await run(
      () => setSignupStatus(emails, to),
      t('admin.notices.statusMany', {
        count: emails.length,
        status: t(`admin.status.${to}`).toLowerCase(),
      }),
    )
    if (ok) setSelected(new Set())
  }

  const copyEmails = async (emails: string[]) => {
    if (await copyText(emails.join(', '))) notify(t('admin.copied'))
  }

  const row = (p: Participant) => (
    <tr
      key={p.email}
      onClick={() => update((params) => params.set('open', p.email))}
      className={cn(
        'h-13 cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]',
        selected.has(p.email) && 'bg-brand-green/[0.06]',
      )}
    >
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected.has(p.email)}
          onChange={(e) => setMany([p.email], e.target.checked)}
          aria-label={t('admin.participants.select', { name: p.name })}
          className={CHECKBOX}
        />
      </td>
      <td
        className={cn(
          CELL,
          'text-brand-text-dim hidden tabular-nums sm:table-cell',
        )}
      >
        {p.order}
      </td>
      <td className={cn(CELL, 'max-w-72')}>
        <div className="truncate leading-5 font-semibold text-white">
          {p.name}
        </div>
        <div className="text-brand-text-dim truncate text-xs leading-4">
          {p.email}
        </div>
      </td>
      <td
        className={cn(
          CELL,
          'text-brand-text-dim hidden max-w-48 truncate md:table-cell',
        )}
      >
        {p.university}
      </td>
      <td className={cn(CELL, 'hidden max-w-48 truncate sm:table-cell')}>
        {p.team ? (
          <span className="text-white">{p.team.name}</span>
        ) : (
          <span className="text-brand-orange">{t('admin.teams.none')}</span>
        )}
      </td>
      <td
        className={cn(
          CELL,
          'text-brand-text-dim hidden whitespace-nowrap tabular-nums lg:table-cell',
        )}
      >
        {formatDate(p.createdAt)}
      </td>
      <td className={CELL} onClick={(e) => e.stopPropagation()}>
        <select
          value={p.status}
          disabled={busy}
          onChange={(e) =>
            void applyStatus([p.email], e.target.value as SignupStatus)
          }
          aria-label={t('admin.fields.status')}
          className={cn(ROW_INPUT_CLASSES, 'w-28 sm:w-36')}
        >
          {SIGNUP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.status.${s}`)}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.nav.participants')}
        summary={t('admin.participants.summary', {
          total: participants.length,
          teams: data.teams.length,
        })}
        actions={
          <>
            <Button
              variant="outline"
              disabled={visible.length === 0}
              onClick={() => void copyEmails(visibleEmails)}
            >
              {t('admin.participants.copyEmails', { count: visible.length })}
            </Button>
            <Button
              variant="outline"
              disabled={visible.length === 0}
              onClick={() => downloadParticipantsCsv(visible)}
            >
              {t('admin.participants.exportCsv')}
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label={t('admin.fields.status')}
            value={status}
            onChange={(s) =>
              update((p) => (s ? p.set('status', s) : p.delete('status')))
            }
            className="w-full sm:w-auto"
            options={['', ...SIGNUP_STATUSES].map((s) => ({
              value: s,
              label: s ? t(`admin.status.${s}`) : t('admin.all'),
              count: counts[s] ?? 0,
            }))}
          />
          <input
            type="search"
            value={query}
            onChange={(e) =>
              update((p) =>
                e.target.value ? p.set('q', e.target.value) : p.delete('q'),
              )
            }
            placeholder={t('admin.participants.search')}
            aria-label={t('admin.participants.search')}
            className={cn(INPUT_CLASSES, 'min-w-56 flex-1')}
          />
          <Button
            variant="outline"
            aria-pressed={grouped}
            className={cn(grouped && TOGGLE_ACTIVE)}
            onClick={() =>
              update((p) => (grouped ? p.delete('group') : p.set('group', '1')))
            }
          >
            {t('admin.participants.groupByTeam')}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setFilters([
                ...filters,
                { field: 'university', op: 'contains', value: '' },
              ])
            }
          >
            {t('admin.filters.add')}
          </Button>
          {hasFilters && (
            <Button
              variant="outline"
              onClick={() =>
                update((p) => {
                  p.delete('f')
                  p.delete('q')
                  p.delete('status')
                })
              }
            >
              {t('admin.filters.clear')}
            </Button>
          )}
        </div>

        {filters.map((filter, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              value={filter.field}
              onChange={(e) =>
                patchFilter(index, {
                  field: e.target.value as Filter['field'],
                })
              }
              aria-label={t('admin.filters.field')}
              className={cn(INPUT_CLASSES, 'w-full sm:w-52')}
            >
              {FILTER_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {t(`admin.fields.${field}`)}
                </option>
              ))}
            </select>
            <select
              value={filter.op}
              onChange={(e) =>
                patchFilter(index, { op: e.target.value as Filter['op'] })
              }
              aria-label={t('admin.filters.op')}
              className={cn(INPUT_CLASSES, 'w-full sm:w-44')}
            >
              {FILTER_OPS.map((op) => (
                <option key={op} value={op}>
                  {t(`admin.filters.ops.${op}`)}
                </option>
              ))}
            </select>
            {filter.op === 'contains' || filter.op === 'is' ? (
              <input
                value={filter.value}
                onChange={(e) => patchFilter(index, { value: e.target.value })}
                aria-label={t('admin.filters.value')}
                placeholder={t('admin.filters.value')}
                className={cn(INPUT_CLASSES, 'min-w-40 flex-1')}
              />
            ) : (
              <span className="hidden flex-1 sm:block" />
            )}
            <Button
              variant="outline"
              onClick={() => setFilters(filters.filter((_, i) => i !== index))}
            >
              {t('admin.filters.remove')}
            </Button>
          </div>
        ))}
      </div>

      <div className={cn(SURFACE_CLASSES, 'overflow-x-auto')}>
        <table className="w-full text-left text-sm leading-5">
          <thead className="text-brand-text-dim">
            <tr>
              <th className={cn(HEAD, 'w-10')}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setMany(visibleEmails, !allSelected)}
                  aria-label={t('admin.participants.selectAll')}
                  className={CHECKBOX}
                />
              </th>
              <th className={cn(HEAD, 'hidden w-12 sm:table-cell')}>#</th>
              <th className={HEAD}>{t('admin.fields.name')}</th>
              <th className={cn(HEAD, 'hidden md:table-cell')}>
                {t('admin.fields.university')}
              </th>
              <th className={cn(HEAD, 'hidden sm:table-cell')}>
                {t('admin.participants.team')}
              </th>
              <th className={cn(HEAD, 'hidden lg:table-cell')}>
                {t('admin.fields.createdAt')}
              </th>
              <th className={cn(HEAD, 'w-34 sm:w-42')}>
                {t('admin.fields.status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr className="border-t border-white/[0.06]">
                <td
                  colSpan={COLUMN_COUNT}
                  className="text-brand-text-dim px-3 py-12 text-center"
                >
                  {t('admin.participants.empty')}
                </td>
              </tr>
            )}
            {groups
              ? groups.map(({ team, members }) => {
                  const memberEmails = members.map((m) => m.email)
                  const allMembersSelected = memberEmails.every((email) =>
                    selected.has(email),
                  )
                  const teamEmails = team
                    ? participants
                        .filter((p) => p.teamId === team.id)
                        .map((p) => p.email)
                    : []
                  return (
                    <Fragment key={team?.id ?? '__none__'}>
                      <tr className="h-12 border-t border-white/10 bg-white/[0.04]">
                        <td className={CELL}>
                          <input
                            type="checkbox"
                            checked={allMembersSelected}
                            onChange={() =>
                              setMany(memberEmails, !allMembersSelected)
                            }
                            aria-label={t('admin.participants.select', {
                              name: team?.name ?? t('admin.teams.none'),
                            })}
                            className={CHECKBOX}
                          />
                        </td>
                        <td className={cn(CELL, 'hidden sm:table-cell')} />
                        <td colSpan={COLUMN_COUNT - 2} className={CELL}>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'truncate font-semibold',
                                team ? 'text-white' : 'text-brand-orange',
                              )}
                            >
                              {team?.name ?? t('admin.teams.none')}
                            </span>
                            {team && (
                              <span
                                className={cn(
                                  'tabular-nums',
                                  team.memberCount >= data.maxTeamSize
                                    ? 'text-brand-green'
                                    : 'text-brand-orange',
                                )}
                              >
                                {team.memberCount}/{data.maxTeamSize}
                              </span>
                            )}
                            {team && (
                              <span className="ml-auto hidden shrink-0 gap-2 sm:flex">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    void applyStatus(teamEmails, 'accepted')
                                  }
                                >
                                  {t('admin.teams.acceptAll')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    void applyStatus(teamEmails, 'rejected')
                                  }
                                >
                                  {t('admin.teams.rejectAll')}
                                </Button>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {members.map(row)}
                    </Fragment>
                  )
                })
              : visible.map(row)}
          </tbody>
        </table>
      </div>

      {selectedVisible.length > 0 && (
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-2 rounded-lg border border-white/15 bg-[#1f1450]/95 p-2 pl-4 shadow-2xl backdrop-blur-md">
          <span className="mr-2 text-sm leading-5 font-semibold text-white">
            {t('admin.participants.selected', {
              count: selectedVisible.length,
            })}
          </span>
          {SIGNUP_STATUSES.map((s) => (
            <Button
              key={s}
              variant={s === 'accepted' ? 'default' : 'outline'}
              disabled={busy}
              onClick={() => void applyStatus(selectedVisible, s)}
            >
              {t(`admin.actions.${s}`)}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => void copyEmails(selectedVisible)}
          >
            {t('admin.copy')}
          </Button>
          <Button
            variant="outline"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            {t('admin.participants.clearSelection')}
          </Button>
        </div>
      )}

      {open && (
        <ParticipantPanel
          key={`${open.email}:${open.teamId}`}
          participant={open}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { SignupStatus } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

// One scale for every admin screen.
// Text: 20px page titles, 16px card and section titles, 14px body,
// 12px metadata. Weights: 700 page titles, 600 names, titles and
// controls, 400 the rest.
// Controls: 36px tall (h-9) in toolbars and forms, 32px (h-8) inside
// table rows and cards. Borders match the outline Button.

/** Inputs and selects in toolbars and forms. */
export const INPUT_CLASSES =
  'h-9 rounded-lg border border-white/14 bg-white/[0.05] px-3 text-sm text-white transition-colors placeholder:text-white/40 hover:border-white/25 focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/20 focus:outline-none disabled:opacity-50 [&>option]:bg-[#1f1450]'

/** Inputs and selects inside table rows and cards. */
export const ROW_INPUT_CLASSES =
  'h-8 rounded-lg border border-white/14 bg-white/[0.05] px-3 text-sm text-white transition-colors placeholder:text-white/40 hover:border-white/25 focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/20 focus:outline-none disabled:opacity-50 [&>option]:bg-[#1f1450]'

// Flat, solid work surfaces. Frosted glass is kept for UI that floats
// over content (the bulk action bar and the toast).
export const SURFACE_CLASSES =
  'rounded-lg border border-white/10 bg-white/[0.035]'

const STATUS_CLASSES: Record<SignupStatus, string> = {
  pending: 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange',
  accepted: 'border-brand-green/40 bg-brand-green/10 text-brand-green',
  rejected: 'border-brand-red/40 bg-brand-red/10 text-brand-red',
}

/** Fixed 24px tall, so it lines up with text rows wherever it sits. */
export function StatusPill({ status }: { status: SignupStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold',
        STATUS_CLASSES[status] ?? 'border-white/20 text-white',
      )}
    >
      {t(`admin.status.${status}`, { defaultValue: status })}
    </span>
  )
}

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  count?: number
}

/** A row of mutually exclusive buttons, 36px tall like the inputs. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex h-9 items-stretch gap-0.5 rounded-lg border border-white/14 bg-white/[0.04] p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled || active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-default',
              active
                ? 'bg-white/15 text-white'
                : 'text-brand-text-dim hover:text-white disabled:opacity-50',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="text-xs font-normal tabular-nums opacity-70">
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Title, one line of context under it, and actions aligned to its base. */
export function PageHeader({
  title,
  summary,
  actions,
}: {
  title: string
  summary: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl leading-7 font-bold text-white">{title}</h1>
        <p className="text-brand-text-dim mt-1 text-sm leading-5">{summary}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function CloseButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('admin.close')}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white',
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  )
}

import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const inputClasses =
  'h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-base text-white transition-[border-color,box-shadow,background-color] placeholder:text-white/30 hover:border-white/20 focus:border-brand-green focus:bg-white/[0.09] focus:ring-[3px] focus:ring-brand-green/20 focus:outline-none'

export function FieldLabel({
  htmlFor,
  label,
  optional,
}: {
  htmlFor?: string
  label: string
  optional?: boolean
}) {
  const { t } = useTranslation()
  return (
    <label htmlFor={htmlFor} className="type-small mb-2 block text-white">
      {label}
      {optional && (
        <span className="text-brand-text-dim"> ({t('signup.optional')})</span>
      )}
    </label>
  )
}

/**
 * The line under a field. It is always rendered, so an error appearing
 * never pushes the layout. When there is no error it can show a hint.
 */
export function FieldError({
  id,
  message,
  hint,
}: {
  id: string
  message?: string
  hint?: ReactNode
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'type-small mt-1.5 min-h-5',
        message ? 'text-destructive' : 'text-brand-text-dim',
      )}
    >
      {message || hint}
    </p>
  )
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  optional,
  error,
  hint,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'url'
  inputMode?: 'text' | 'numeric' | 'email' | 'url'
  autoComplete?: string
  placeholder?: string
  optional?: boolean
  error?: string
  /** Shown in the line under the field when there is no error. */
  hint?: ReactNode
  className?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} optional={optional} />
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(inputClasses, error && 'border-destructive')}
      />
      <FieldError id={errorId} message={error} hint={hint} />
    </div>
  )
}

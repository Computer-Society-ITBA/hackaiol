import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const inputClasses =
  'h-11 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 text-base text-white transition-[border-color,box-shadow,background-color] placeholder:text-white/35 focus:border-ring focus:bg-white/[0.09] focus:ring-[3px] focus:ring-ring/25 focus:outline-none'

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
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {label}
      {optional && (
        <span className="text-brand-text-dim/70 font-normal">
          {' '}
          ({t('signup.optional')})
        </span>
      )}
    </label>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-destructive mt-1.5 text-sm">
      {message}
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
      <FieldError id={errorId} message={error} />
    </div>
  )
}

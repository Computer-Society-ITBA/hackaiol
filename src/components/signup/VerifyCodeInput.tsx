import { useId, useRef } from 'react'

import { CODE_LENGTH } from '@/components/signup/code'
import { FieldError } from '@/components/signup/fields'
import { cn } from '@/lib/utils'

export function VerifyCodeInput({
  value,
  onChange,
  label,
  error,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  error?: string
}) {
  const errorId = `${useId()}-error`
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const focus = (index: number) => {
    boxes.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus()
  }

  const splice = (index: number, digits: string) => {
    const chars = value.padEnd(CODE_LENGTH, ' ').slice(0, CODE_LENGTH).split('')
    if (digits) {
      for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
        chars[index + i] = digits[i]
      }
      focus(index + digits.length)
    } else {
      chars[index] = ' '
    }
    onChange(chars.join(''))
  }

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label={label}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const digit = /\d/.test(value[i] ?? '') ? value[i] : ''
          return (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={i === 0}
              maxLength={CODE_LENGTH}
              aria-label={`${label} ${i + 1}`}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              value={digit}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                if (digits) splice(i, digits)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  e.preventDefault()
                  if (digit) splice(i, '')
                  else if (i > 0) {
                    splice(i - 1, '')
                    focus(i - 1)
                  }
                }
                if (e.key === 'ArrowLeft') focus(i - 1)
                if (e.key === 'ArrowRight') focus(i + 1)
              }}
              onPaste={(e) => {
                e.preventDefault()
                const digits = e.clipboardData
                  .getData('text')
                  .replace(/\D/g, '')
                if (digits) splice(i, digits)
              }}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(
                'focus:border-ring focus:ring-ring/25 h-14 w-full min-w-0 rounded-lg border border-white/15 bg-white/[0.06] text-center text-xl font-semibold tabular-nums transition-[border-color,box-shadow] focus:ring-[3px] focus:outline-none',
                error && 'border-destructive',
              )}
            />
          )
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

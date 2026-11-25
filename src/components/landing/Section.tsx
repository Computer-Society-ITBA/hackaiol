import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Editorial section: a sticky label column on the left, content on the right. */
export function Section({
  id,
  label,
  children,
  className,
}: {
  id?: string
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'mx-auto grid max-w-6xl scroll-mt-6 gap-6 px-5 py-20 md:grid-cols-[11rem_1fr] md:gap-10 md:py-28',
        className,
      )}
    >
      <h2 className="text-brand-green text-sm font-semibold tracking-[0.14em] uppercase md:sticky md:top-10 md:self-start md:pt-3">
        {label}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

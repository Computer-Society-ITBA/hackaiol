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
        'mx-auto grid max-w-6xl scroll-mt-6 gap-5 px-5 py-12 md:grid-cols-[10rem_1fr] md:gap-10 md:py-16',
        className,
      )}
    >
      <h2 className="type-eyebrow text-brand-green md:sticky md:top-10 md:self-start md:pt-2">
        {label}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

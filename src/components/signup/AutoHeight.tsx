import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Animates its height to follow its content, so the card grows and shrinks
 * smoothly when the step changes or an error appears instead of jumping.
 */
export function AutoHeight({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()

  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      style={{ height }}
      className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={inner} className={cn(className)}>
        {children}
      </div>
    </div>
  )
}

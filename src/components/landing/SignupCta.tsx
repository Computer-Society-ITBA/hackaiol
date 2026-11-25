import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'

/**
 * The main call to action: a tilted green tape, like the quote ticker,
 * with the label scrolling across it. It straightens and pauses on hover.
 */
export function SignupCta({ className }: { className?: string }) {
  const { t } = useTranslation()
  const label = t('hero.cta')
  const word = (
    <span className="flex shrink-0 items-center gap-5 pr-5">
      {label}
      <span aria-hidden="true" className="text-[0.55em]">
        ▲
      </span>
    </span>
  )
  return (
    <Link
      to="/signup"
      aria-label={label}
      className={cn(
        'group bg-brand-green text-brand-ink relative inline-flex h-16 w-72 -rotate-2 items-center overflow-hidden rounded-md text-xl font-extrabold uppercase transition-transform duration-300 select-none hover:rotate-0 sm:h-[4.5rem] sm:w-80 sm:text-2xl',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="ticker-track flex w-max [animation-duration:9s] group-hover:[animation-play-state:paused]"
      >
        {word}
        {word}
        {word}
        {word}
        {word}
        {word}
      </span>
    </Link>
  )
}

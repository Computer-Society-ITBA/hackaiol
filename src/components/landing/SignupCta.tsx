import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { tapeClasses } from '@/lib/tape'
import { cn } from '@/lib/utils'

/** The label scrolling across the tape. It pauses on hover. */
export function TapeTrack({ label }: { label: string }) {
  const word = (
    <span className="flex shrink-0 items-center gap-5 pr-5">
      {label}
      <span aria-hidden="true" className="text-[0.55em]">
        ▲
      </span>
    </span>
  )
  return (
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
  )
}

/**
 * The main call to action: a tilted green tape, like the quote ticker,
 * with the label scrolling across it. It straightens and pauses on hover.
 */
export function SignupCta({ className }: { className?: string }) {
  const { t } = useTranslation()
  const label = t('hero.cta')
  return (
    <Link
      to="/signup"
      aria-label={label}
      className={cn(tapeClasses, className)}
    >
      <TapeTrack label={label} />
    </Link>
  )
}

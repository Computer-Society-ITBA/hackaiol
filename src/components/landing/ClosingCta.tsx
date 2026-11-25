import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

const DETAILS = ['date', 'time', 'place'] as const

/**
 * The closing call to action: the title itself is a tilted green tape
 * that links to the sign up, crossed by a dim tape with the event data.
 */
export function ClosingCta() {
  const { t } = useTranslation()
  const title = t('finalCta.title')

  const word = (
    <span className="flex shrink-0 items-center gap-6 pr-6">
      {title}
      <span aria-hidden="true" className="text-[0.5em]">
        ▲
      </span>
    </span>
  )
  const details = (
    <span className="flex shrink-0 gap-10 pr-10">
      {DETAILS.map((detail) => (
        <span key={detail} className="flex gap-3">
          <span className="text-brand-green/60">
            {t(`event.${detail}.label`)}
          </span>
          <span>{t(`event.${detail}.value`)}</span>
        </span>
      ))}
    </span>
  )

  return (
    <section className="relative overflow-x-clip pt-6 pb-20 md:pt-10 md:pb-24">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[62%] -mx-[5vw] rotate-[1.5deg] overflow-hidden bg-white/[0.06] py-3 text-sm font-semibold tracking-[0.2em] text-white/40 uppercase"
      >
        <div className="ticker-track flex w-max [animation-direction:reverse]">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i}>{details}</span>
          ))}
        </div>
      </div>
      <Link
        to="/signup"
        aria-label={title}
        className="group bg-brand-green text-brand-ink relative -mx-[5vw] block -rotate-[2.5deg] overflow-hidden py-5 text-4xl font-extrabold tracking-tight uppercase shadow-[0_20px_50px_-20px_rgb(0_211_127/0.6)] transition-transform duration-300 hover:rotate-0 sm:text-6xl"
      >
        <span
          aria-hidden="true"
          className="ticker-track flex w-max [animation-duration:18s] group-hover:[animation-play-state:paused]"
        >
          {word}
          {word}
          {word}
          {word}
        </span>
      </Link>
    </section>
  )
}

import { useTranslation } from 'react-i18next'

import { ClaudeCodeWindow } from '@/components/landing/ClaudeCodeWindow'
import { MarketChart } from '@/components/landing/MarketChart'
import { SignupCta } from '@/components/landing/SignupCta'
import { Ticker } from '@/components/landing/Ticker'

const DETAILS = ['date', 'time', 'place'] as const

export function Hero() {
  const { t } = useTranslation()
  const terminal = (
    <div className="relative">
      <MarketChart className="absolute -right-[12%] -bottom-20 -left-[60%] h-64 opacity-40 sm:h-80" />
      <ClaudeCodeWindow className="lg:rotate-[-1deg]" />
    </div>
  )
  // On desktop everything down to the ticker fills one screen below the
  // header. On small screens it just flows, with the terminal under the
  // event details and the ticker closing the hero.
  return (
    <div className="flex flex-col lg:min-h-[calc(100svh-var(--header-h))]">
      <section className="relative mx-auto flex w-full max-w-6xl flex-col px-5 pt-6 lg:flex-1 lg:pt-4">
        <h1 className="text-[clamp(3.5rem,min(21vw,21svh),17rem)] leading-[0.85] font-extrabold tracking-[-0.045em] whitespace-nowrap">
          {t('hero.titleStart')}
          <span className="text-brand-green pr-[0.04em] italic">
            {t('hero.titleEnd')}
          </span>
        </h1>

        <div className="mt-6 flex flex-col items-start gap-8 lg:mt-4 lg:flex-row lg:items-end lg:justify-between">
          <p className="text-brand-text-dim max-w-md text-lg sm:text-2xl">
            {t('hero.subtitle')}
          </p>
          <SignupCta className="rotate-[2.5deg] lg:rotate-[-1deg]" />
        </div>

        <div className="relative grid gap-8 pt-10 pb-6 lg:flex-1 lg:grid-cols-[1fr_2fr] lg:content-center lg:items-center lg:gap-12 lg:py-6">
          <dl className="grid grid-cols-3 gap-6 lg:grid-cols-1 lg:gap-6">
            {DETAILS.map((detail) => (
              <div key={detail}>
                <dt className="type-eyebrow text-brand-green mb-1">
                  {t(`event.${detail}.label`)}
                </dt>
                <dd className="text-2xl leading-tight font-bold sm:text-4xl">
                  {t(`event.${detail}.value`)}
                </dd>
              </div>
            ))}
          </dl>

          {terminal}
        </div>
      </section>
      <Ticker />
    </div>
  )
}

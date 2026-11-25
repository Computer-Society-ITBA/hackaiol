import { useTranslation } from 'react-i18next'

import { ClaudeCodeWindow } from '@/components/landing/ClaudeCodeWindow'
import { MarketChart } from '@/components/landing/MarketChart'
import { SignupCta } from '@/components/landing/SignupCta'

const DETAILS = ['date', 'time', 'place'] as const

export function Hero() {
  const { t } = useTranslation()
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-10 pb-24 sm:pt-14">
      <h1 className="text-[clamp(3.5rem,21vw,17rem)] leading-[0.85] font-extrabold tracking-[-0.045em] whitespace-nowrap">
        {t('hero.titleStart')}
        <span className="text-brand-green pr-[0.04em] italic">
          {t('hero.titleEnd')}
        </span>
      </h1>

      <div className="mt-10 flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-brand-text-dim max-w-md text-lg font-light sm:text-2xl">
          {t('hero.subtitle')}
        </p>
        <SignupCta className="rotate-[2.5deg]" />
      </div>

      <div className="relative mt-20 grid gap-12 lg:mt-24 lg:grid-cols-[1fr_2fr] lg:items-start">
        <dl className="grid grid-cols-3 gap-6 lg:grid-cols-1 lg:gap-8">
          {DETAILS.map((detail) => (
            <div key={detail}>
              <dt className="text-brand-green mb-1 text-xs font-semibold tracking-[0.14em] uppercase">
                {t(`event.${detail}.label`)}
              </dt>
              <dd className="text-2xl leading-tight font-bold sm:text-4xl">
                {t(`event.${detail}.value`)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="relative">
          <MarketChart className="absolute -right-[12%] -bottom-20 -left-[60%] h-64 opacity-40 sm:h-80" />
          <ClaudeCodeWindow className="lg:rotate-[-1deg]" />
        </div>
      </div>
    </section>
  )
}

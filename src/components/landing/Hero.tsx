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
  // Everything down to the ticker fills one screen below the header. On
  // small screens the terminal cannot fit, so it moves below the ticker.
  return (
    <>
      <div className="flex min-h-[calc(100svh-var(--header-h))] flex-col">
        <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-6 lg:pt-4">
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

          <div className="relative grid flex-1 content-center gap-12 py-8 lg:grid-cols-[1fr_2fr] lg:items-center lg:py-6">
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

            <div className="hidden lg:block">{terminal}</div>
          </div>
        </section>
        <Ticker />
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-4 pb-12 lg:hidden">
        {terminal}
      </div>
    </>
  )
}

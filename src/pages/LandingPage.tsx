import { useTranslation } from 'react-i18next'

import { AboutSection } from '@/components/landing/AboutSection'
import { EventSection } from '@/components/landing/EventSection'
import { Hero } from '@/components/landing/Hero'
import { IdeasSection } from '@/components/landing/IdeasSection'
import { OrganizersSection } from '@/components/landing/OrganizersSection'
import { SignupCta } from '@/components/landing/SignupCta'
import { Ticker } from '@/components/landing/Ticker'

export default function LandingPage() {
  const { t } = useTranslation()
  return (
    <main>
      <Hero />
      <Ticker />
      <AboutSection />
      <IdeasSection />
      <EventSection />
      <OrganizersSection />

      <section className="mx-auto flex max-w-6xl flex-col items-start gap-10 px-5 pt-10 pb-28 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-3xl text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
          {t('finalCta.title')}
        </h2>
        <SignupCta className="flex-shrink-0 rotate-[1.5deg]" />
      </section>
    </main>
  )
}

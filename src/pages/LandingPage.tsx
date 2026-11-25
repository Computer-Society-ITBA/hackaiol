import { AboutSection } from '@/components/landing/AboutSection'
import { ClosingCta } from '@/components/landing/ClosingCta'
import { EventSection } from '@/components/landing/EventSection'
import { Hero } from '@/components/landing/Hero'
import { IdeasSection } from '@/components/landing/IdeasSection'
import { OrganizersSection } from '@/components/landing/OrganizersSection'

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <AboutSection />
      <IdeasSection />
      <EventSection />
      <OrganizersSection />
      <ClosingCta />
    </main>
  )
}

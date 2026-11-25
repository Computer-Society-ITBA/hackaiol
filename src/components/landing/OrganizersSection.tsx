import { useTranslation } from 'react-i18next'

import { Section } from '@/components/landing/Section'

// From csitba.com.ar.
const CS_STATS = [
  { value: '+30', key: 'events' },
  { value: '+10.000', key: 'people' },
  { value: '+10', key: 'countries' },
] as const

export function OrganizersSection() {
  const { t } = useTranslation()
  return (
    <Section id="organizan" label={t('organizers.label')}>
      <div className="grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-white/15">
        <div className="md:pr-10">
          <a
            href="https://www.csitba.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-5 inline-block"
          >
            <img
              src="/brand/cs-logo.png"
              alt="IEEE Computer Society ITBA Student Branch Chapter"
              className="h-12 w-auto"
            />
          </a>
          <p className="type-body text-brand-text-dim mb-6">
            {t('organizers.cs.desc')}
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-4">
            {CS_STATS.map((stat) => (
              <div key={stat.key} className="flex flex-col-reverse">
                <dt className="type-small text-brand-text-dim">
                  {t(`organizers.cs.stats.${stat.key}`)}
                </dt>
                <dd className="text-2xl font-bold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:pl-10">
          <a
            href="https://www.invertironline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-5 inline-block"
          >
            <img
              src="/brand/iol-logo.png"
              alt="IOL Inversiones"
              className="h-10 w-auto"
            />
          </a>
          <p className="type-body text-brand-text-dim">
            {t('organizers.iol.desc')}
          </p>
        </div>
      </div>
    </Section>
  )
}

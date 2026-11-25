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
      <div className="grid gap-14 md:grid-cols-2 md:gap-0 md:divide-x md:divide-white/15">
        <div className="md:pr-10">
          <a
            href="https://www.csitba.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-block"
          >
            <img
              src="/brand/cs-logo.png"
              alt="IEEE Computer Society ITBA Student Branch Chapter"
              className="h-16 w-auto"
            />
          </a>
          <p className="text-brand-text-dim mb-8 text-lg">
            {t('organizers.cs.desc')}
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-4">
            {CS_STATS.map((stat) => (
              <div key={stat.key} className="flex flex-col-reverse">
                <dt className="text-brand-text-dim text-sm">
                  {t(`organizers.cs.stats.${stat.key}`)}
                </dt>
                <dd className="text-brand-green text-3xl font-extrabold">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:pl-10">
          <a
            href="https://www.invertironline.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-block"
          >
            <img
              src="/brand/iol-logo.png"
              alt="IOL Inversiones"
              className="h-14 w-auto"
            />
          </a>
          <p className="text-brand-text-dim text-lg">
            {t('organizers.iol.desc')}
          </p>
        </div>
      </div>
    </Section>
  )
}

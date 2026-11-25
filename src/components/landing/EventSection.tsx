import { useTranslation } from 'react-i18next'

import { Section } from '@/components/landing/Section'

const PERKS = [
  { key: 'food', hasDesc: true },
  { key: 'recruiting', hasDesc: true },
  { key: 'prizes', hasDesc: false },
  { key: 'networking', hasDesc: false },
] as const

export function EventSection() {
  const { t } = useTranslation()
  return (
    <Section id="dia" label={t('event.label')}>
      <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {PERKS.map(({ key, hasDesc }) => (
          <li key={key} className="flex items-start gap-3">
            <svg
              viewBox="0 0 10 9"
              aria-hidden="true"
              className="fill-brand-green mt-3 h-3 w-3.5 flex-shrink-0 sm:mt-3.5"
            >
              <path d="M5 0l5 9H0z" />
            </svg>
            <div>
              <p className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                {t(`event.perks.${key}.title`)}
              </p>
              {hasDesc && (
                <p className="text-brand-text-dim mt-2 text-lg">
                  {t(`event.perks.${key}.desc`)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

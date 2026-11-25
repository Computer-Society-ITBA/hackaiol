import { useTranslation } from 'react-i18next'

import { Section } from '@/components/landing/Section'

const IDEAS = ['summary', 'options', 'fixedIncome', 'exits'] as const

export function IdeasSection() {
  const { t } = useTranslation()
  return (
    <Section id="ideas" label={t('ideas.label')}>
      <ul className="border-b border-white/15">
        {IDEAS.map((idea, i) => (
          <li
            key={idea}
            className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-t border-white/15 py-8 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
          >
            <span className="text-brand-green pt-2.5 font-mono text-sm leading-none sm:pt-3.5">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10">
              <h3 className="group-hover:text-brand-green mb-2 text-3xl leading-tight font-bold tracking-tight transition-colors sm:text-4xl md:mb-0">
                {t(`ideas.items.${idea}.title`)}
              </h3>
              <p className="text-brand-text-dim text-lg md:pt-2">
                {t(`ideas.items.${idea}.desc`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

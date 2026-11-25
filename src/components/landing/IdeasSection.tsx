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
            className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-t border-white/15 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]"
          >
            <span className="text-brand-green pt-1.5 font-mono text-xs leading-none sm:pt-2">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10">
              <h3 className="group-hover:text-brand-green mb-1.5 text-xl leading-tight font-bold tracking-tight transition-colors sm:text-2xl md:mb-0">
                {t(`ideas.items.${idea}.title`)}
              </h3>
              <p className="type-small text-brand-text-dim md:pt-1">
                {t(`ideas.items.${idea}.desc`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

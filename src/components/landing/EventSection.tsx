import { useTranslation } from 'react-i18next'

import { Section } from '@/components/landing/Section'
import { cn } from '@/lib/utils'

const PERKS = ['food', 'recruiting', 'prizes', 'networking'] as const

/**
 * Each perk as one oversized word, solid and outlined in turns. On hover
 * the word fills green and nudges right.
 */
export function EventSection() {
  const { t } = useTranslation()
  return (
    <Section id="dia" label={t('event.label')}>
      <ul className="border-t border-white/15 sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-6">
        {PERKS.map((key, i) => (
          <li
            key={key}
            className="group border-b border-white/15 py-1 sm:col-span-2 sm:grid sm:grid-cols-subgrid sm:items-center"
          >
            <span
              className={cn(
                'group-hover:text-brand-green block text-5xl leading-[0.95] font-extrabold tracking-tight uppercase transition-[color,translate] duration-300 group-hover:translate-x-2 sm:text-6xl',
                i % 2
                  ? 'text-transparent [-webkit-text-stroke:1.5px_var(--brand-green)]'
                  : 'text-white',
              )}
            >
              {t(`event.perks.${key}.word`)}
            </span>
            <span className="text-brand-text-dim block max-w-72 pb-1.5 text-sm transition-colors duration-300 group-hover:text-white sm:pb-0">
              {t(`event.perks.${key}.desc`)}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

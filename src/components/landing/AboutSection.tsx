import { Trans, useTranslation } from 'react-i18next'

import { Section } from '@/components/landing/Section'

export function AboutSection() {
  const { t } = useTranslation()
  return (
    <Section id="idea" label={t('about.label')}>
      <p className="text-brand-text-dim max-w-3xl text-xl leading-snug sm:text-3xl">
        <Trans
          i18nKey="about.statement"
          components={{
            strong: <strong className="font-bold text-white" />,
          }}
        />
      </p>
      <a
        href="https://mcp.invertironline.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary mt-6"
      >
        {t('about.link')}
      </a>
    </Section>
  )
}

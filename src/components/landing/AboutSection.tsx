import { Trans, useTranslation } from 'react-i18next'

import { Section } from '@/components/landing/Section'

export function AboutSection() {
  const { t } = useTranslation()
  return (
    <Section id="idea" label={t('about.label')}>
      <p className="text-brand-text-dim max-w-4xl text-3xl leading-snug font-light sm:text-[2.6rem]">
        <Trans
          i18nKey="about.statement"
          components={{
            strong: <strong className="font-semibold text-white" />,
          }}
        />
      </p>
      <a
        href="https://mcp.invertironline.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-green mt-8 inline-block text-lg font-semibold underline decoration-2 underline-offset-[6px]"
      >
        {t('about.link')}
      </a>
    </Section>
  )
}

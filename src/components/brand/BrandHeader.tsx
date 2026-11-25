import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { supportedLngs } from '@/i18n'
import { cn } from '@/lib/utils'

function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage
  return (
    <div
      role="group"
      aria-label={t('a11y.language')}
      className="flex items-center gap-1 text-sm font-semibold"
    >
      {supportedLngs.map((lng, i) => (
        <span key={lng} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className="text-white/25">
              /
            </span>
          )}
          <button
            type="button"
            lang={lng}
            aria-pressed={current === lng}
            onClick={() => void i18n.changeLanguage(lng)}
            className={cn(
              'px-1 uppercase transition-colors',
              current === lng
                ? 'text-brand-green'
                : 'text-brand-text-dim hover:text-white',
            )}
          >
            {lng}
          </button>
        </span>
      ))}
    </div>
  )
}

export function BrandHeader() {
  const { t } = useTranslation()
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 pt-6 sm:pt-8">
      <Link to="/" aria-label={t('a11y.home')}>
        <img
          src="/brand/iol-logo.png"
          alt="IOL Inversiones"
          className="h-7 w-auto sm:h-9"
        />
      </Link>
      <div className="flex items-center gap-5 sm:gap-8">
        <LanguageSwitch />
        <a
          href="https://www.csitba.com.ar/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/brand/cs-logo.png"
            alt="IEEE Computer Society ITBA Student Branch Chapter"
            className="h-9 w-auto sm:h-11"
          />
        </a>
      </div>
    </header>
  )
}

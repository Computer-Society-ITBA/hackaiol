import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

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
    </header>
  )
}

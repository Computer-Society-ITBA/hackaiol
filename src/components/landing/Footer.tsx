import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

const EMAIL = 'computersociety@itba.edu.ar'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'size-5',
  'aria-hidden': true,
}

const SOCIALS: { href: string; labelKey: string; icon: ReactNode }[] = [
  {
    href: 'https://www.instagram.com/computer.society.itba/',
    labelKey: 'a11y.instagram',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" />
      </svg>
    ),
  },
  {
    href: `mailto:${EMAIL}`,
    labelKey: 'a11y.email',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  {
    href: 'https://www.youtube.com/channel/UCGRu7ac5g1M5fuVYPYX8Ifg',
    labelKey: 'a11y.youtube',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5.5" width="18" height="13" rx="4" />
        <path d="M10.3 9.3l5 2.7-5 2.7z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/company/30092847/',
    labelKey: 'a11y.linkedin',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="7.5" y1="10" x2="7.5" y2="16.5" />
        <circle cx="7.5" cy="7" r="1" />
        <path d="M11.5 16.5V10M11.5 12.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v4" />
      </svg>
    ),
  },
]

const EVENT_LINKS = [
  { href: '/#idea', key: 'idea' },
  { href: '/#ideas', key: 'ideas' },
  { href: '/#dia', key: 'day' },
  { href: '/#organizan', key: 'organizers' },
] as const

const linkClass =
  'type-small text-brand-text-dim transition-colors hover:text-white'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t border-white/10 bg-black/15 px-5 pt-16 pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap justify-between gap-12 pb-12">
          <div className="flex max-w-xs flex-col gap-5">
            <a
              href="https://www.csitba.com.ar/"
              target="_blank"
              rel="noopener noreferrer"
              className="self-start"
            >
              <img
                src="/brand/cs-logo.png"
                alt="IEEE Computer Society ITBA Student Branch Chapter"
                className="h-12 w-auto"
              />
            </a>
            <p className="type-small text-brand-text-dim">
              {t('footer.brandDesc')}
            </p>
            <div className="-ml-0.5 flex gap-4">
              {SOCIALS.map((social) => (
                <a
                  key={social.labelKey}
                  href={social.href}
                  aria-label={t(social.labelKey)}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={
                    social.href.startsWith('http')
                      ? 'noopener noreferrer'
                      : undefined
                  }
                  className="text-brand-text-dim hover:text-brand-green transition-colors"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-16">
            <div className="flex flex-col gap-3">
              <h2 className="type-eyebrow text-brand-green">
                {t('footer.columns.event')}
              </h2>
              {EVENT_LINKS.map((link) => (
                <a key={link.key} href={link.href} className={linkClass}>
                  {t(`footer.links.${link.key}`)}
                </a>
              ))}
              <Link to="/signup" className={linkClass}>
                {t('hero.cta')}
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="type-eyebrow text-brand-green">
                {t('footer.columns.contact')}
              </h2>
              <a href={`mailto:${EMAIL}`} className={linkClass}>
                {EMAIL}
              </a>
            </div>
          </div>
        </div>
        <p className="type-small text-brand-text-dim">
          {t('footer.copyright')}
        </p>
      </div>
    </footer>
  )
}

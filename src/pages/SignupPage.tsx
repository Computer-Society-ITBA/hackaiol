import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { SignupForm } from '@/components/signup/SignupForm'

const RULES = ['selection', 'team', 'punctuality'] as const

export default function SignupPage() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-5 pt-10 pb-20 lg:grid-cols-[1fr_1.35fr] lg:gap-14">
      <aside className="lg:sticky lg:top-10 lg:self-start">
        <Link
          to="/"
          className="text-brand-text-dim mb-10 inline-block text-sm transition-colors hover:text-white"
        >
          <span aria-hidden="true">← </span>
          {t('signup.backHome')}
        </Link>
        <h2 className="text-brand-green mb-6 text-sm font-semibold tracking-[0.14em] uppercase">
          {t('rules.title')}
        </h2>
        <div className="flex flex-col gap-8">
          {RULES.map((rule) => (
            <div key={rule} className="border-brand-green border-l-2 pl-5">
              <p className="mb-1.5 text-2xl font-bold">
                {t(`rules.items.${rule}.title`)}
              </p>
              <p className="text-brand-text-dim">
                {t(`rules.items.${rule}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </aside>
      <div className="glass rounded-2xl p-6 sm:p-8">
        <SignupForm />
      </div>
    </main>
  )
}

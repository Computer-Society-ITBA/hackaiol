import { useTranslation } from 'react-i18next'

import { AutoHeight } from '@/components/signup/AutoHeight'
import { MAX_TEAM_SIZE } from '@/components/signup/team'
import { SignupForm } from '@/components/signup/SignupForm'

const RULES = ['selection', 'team', 'punctuality'] as const
const DETAILS = ['date', 'time', 'place'] as const

/**
 * The sign up as an event pass: the form on glass, like the hero's Claude
 * window, with a green stub that holds the event data.
 */
export default function SignupPage() {
  const { t } = useTranslation()
  const stub = [
    ...DETAILS.map((d) => ({
      key: d,
      label: t(`event.${d}.label`),
      value: t(`event.${d}.value`),
    })),
    {
      key: 'team',
      label: t('signup.pass.team.label'),
      value: t('signup.pass.team.value', { max: MAX_TEAM_SIZE }),
    },
  ]

  return (
    <main className="mx-auto max-w-5xl px-5 pt-12 pb-20">
      <div className="relative">
        <div className="bg-brand-green/25 absolute -top-12 -left-10 size-64 rounded-full blur-3xl" />
        <div className="absolute -right-12 -bottom-14 size-72 rounded-full bg-[#6b5cff]/35 blur-3xl" />

        <div className="relative rounded-[19px] bg-gradient-to-br from-white/45 via-white/15 to-white/[0.06] p-[3px] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]">
          <div className="relative grid overflow-hidden rounded-2xl bg-[#1b1250]/40 backdrop-blur-lg md:grid-cols-[1fr_15rem]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.07] to-transparent" />

            <AutoHeight className="relative px-6 py-8 sm:px-10 sm:py-10">
              <SignupForm />
            </AutoHeight>

            <aside className="bg-brand-green text-brand-ink border-brand-ink/25 order-first flex flex-col gap-6 p-6 md:order-none md:gap-10 md:border-l-2 md:border-dashed md:p-10">
              <p className="text-4xl leading-[0.85] font-extrabold tracking-[-0.04em]">
                {t('hero.titleStart')}
                <span className="pr-[0.04em] italic">{t('hero.titleEnd')}</span>
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 md:grid-cols-1 md:gap-y-5">
                {stub.map((item) => (
                  <div key={item.key}>
                    <dt className="type-eyebrow opacity-60">{item.label}</dt>
                    <dd className="type-heading">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="type-eyebrow text-brand-green mb-5">
          {t('rules.title')}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {RULES.map((rule) => (
            <div key={rule}>
              <p className="type-heading">{t(`rules.items.${rule}.title`)}</p>
              <p className="type-small text-brand-text-dim mt-1">
                {t(`rules.items.${rule}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

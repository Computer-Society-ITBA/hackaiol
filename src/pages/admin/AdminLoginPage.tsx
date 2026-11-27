import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { INPUT_CLASSES } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { AdminApiError, getSession, signIn } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

type LoginState = { from?: string; reason?: 'expired' } | null

const DEFAULT_PATH = '/admin/participants'

/** Only same-app admin paths are followed after sign-in. */
function safeFrom(from: string | undefined): string {
  return from?.startsWith('/admin/') && !from.startsWith('/admin/login')
    ? from
    : DEFAULT_PATH
}

export default function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginState
  const baseId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<'invalid' | 'unavailable' | null>(null)

  if (getSession()) return <Navigate to={safeFrom(state?.from)} replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !username || !password) return
    setSubmitting(true)
    setError(null)
    try {
      await signIn(username, password)
      navigate(safeFrom(state?.from), { replace: true })
    } catch (err) {
      setPassword('')
      setError(
        err instanceof AdminApiError && err.kind === 'unauthorized'
          ? 'invalid'
          : 'unavailable',
      )
      setSubmitting(false)
    }
  }

  const message = error
    ? t(`admin.login.${error}`)
    : state?.reason === 'expired'
      ? t('admin.login.expired')
      : ''

  return (
    <>
      <title>{t('admin.login.title')}</title>
      <meta name="robots" content="noindex, nofollow" />
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm rounded-lg border border-white/10 bg-white/[0.035] p-6"
          noValidate
        >
          <h1 className="text-xl leading-7 font-bold text-white">
            {t('admin.login.heading')}
          </h1>
          <p className="text-brand-text-dim mt-1 text-sm leading-5">
            {t('admin.login.subtitle')}
          </p>

          <label
            htmlFor={`${baseId}-user`}
            className="text-brand-text-dim mt-6 mb-2 block text-sm leading-5"
          >
            {t('admin.login.username')}
          </label>
          <input
            id={`${baseId}-user`}
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={cn(INPUT_CLASSES, 'w-full')}
          />

          <label
            htmlFor={`${baseId}-pass`}
            className="text-brand-text-dim mt-4 mb-2 block text-sm leading-5"
          >
            {t('admin.login.password')}
          </label>
          <input
            id={`${baseId}-pass`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={`${baseId}-msg`}
            className={cn(INPUT_CLASSES, 'w-full')}
          />

          <p
            id={`${baseId}-msg`}
            role="alert"
            className={cn(
              'mt-2 min-h-5 text-sm leading-5',
              error ? 'text-destructive' : 'text-brand-orange',
            )}
          >
            {message}
          </p>

          <Button
            type="submit"
            className="mt-4 w-full"
            disabled={submitting || !username || !password}
          >
            {submitting ? t('admin.login.submitting') : t('admin.login.submit')}
          </Button>
        </form>
      </main>
    </>
  )
}

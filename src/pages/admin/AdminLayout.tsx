import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router'

import type { AdminContext } from '@/components/admin/context'
import { buildParticipants } from '@/components/admin/model'
import { CloseButton, SURFACE_CLASSES } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import {
  AdminApiError,
  clearSession,
  fetchAdminData,
  getSession,
  type AdminData,
} from '@/lib/adminApi'
import { cn } from '@/lib/utils'

type Notice = { kind: 'ok' | 'error'; text: string }

const NAV = [
  { to: '/admin/participants', key: 'participants' },
  { to: '/admin/teams', key: 'teams' },
] as const

/**
 * Guards every backoffice screen. Without a live session it redirects to
 * sign-in before anything renders, and any request the API rejects as
 * unauthorized signs out and sends back there too. Screens only ever
 * render data from an authenticated response.
 */
export default function AdminLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [hasSession] = useState(() => getSession() !== null)
  const [data, setData] = useState<AdminData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const expire = useCallback(() => {
    clearSession()
    navigate('/admin/login', {
      replace: true,
      state: {
        from: window.location.pathname + window.location.search,
        reason: 'expired',
      },
    })
  }, [navigate])

  const load = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const next = await fetchAdminData(controller.signal)
      if (controller.signal.aborted) return
      setData(next)
      setLoadError(false)
    } catch (err) {
      if (controller.signal.aborted) return
      if (err instanceof AdminApiError && err.kind === 'unauthorized') {
        expire()
        return
      }
      setLoadError(true)
      setNotice({ kind: 'error', text: t('admin.errors.unavailable') })
    }
  }, [expire, t])

  useEffect(() => {
    if (hasSession) void load()
    return () => controllerRef.current?.abort()
  }, [hasSession, load])

  useEffect(() => {
    if (notice?.kind !== 'ok') return
    const id = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(id)
  }, [notice])

  const run = useCallback<AdminContext['run']>(
    async (action, success) => {
      setBusy(true)
      setNotice(null)
      try {
        await action()
        if (success) setNotice({ kind: 'ok', text: success })
        await load()
        return true
      } catch (err) {
        const kind = err instanceof AdminApiError ? err.kind : 'unavailable'
        if (kind === 'unauthorized') {
          expire()
          return false
        }
        setNotice({ kind: 'error', text: t(`admin.errors.${kind}`) })
        return false
      } finally {
        setBusy(false)
      }
    },
    [expire, load, t],
  )

  const participants = useMemo(
    () => (data ? buildParticipants(data) : []),
    [data],
  )
  const notify = useCallback(
    (text: string) => setNotice({ kind: 'ok', text }),
    [],
  )
  const context = useMemo<AdminContext | null>(
    () => (data ? { data, participants, busy, run, notify } : null),
    [data, participants, busy, run, notify],
  )

  if (!hasSession) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  const signOut = () => {
    controllerRef.current?.abort()
    clearSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <>
      <title>{t('admin.title')}</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="relative z-10 min-h-screen">
        <header className="border-b border-white/10 bg-[#120729]">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
            <nav className="flex h-8 items-center gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-brand-text-dim hover:text-white',
                    )
                  }
                >
                  {t(`admin.nav.${item.key}`)}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex h-8 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load()}
                disabled={busy}
              >
                {t('admin.refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                {t('admin.signOut')}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {context ? (
            <Outlet context={context} />
          ) : loadError ? (
            <div className={cn(SURFACE_CLASSES, 'p-8 text-center')}>
              <p className="text-brand-text-dim mb-4 text-sm">
                {t('admin.errors.unavailable')}
              </p>
              <Button onClick={() => void load()}>{t('admin.retry')}</Button>
            </div>
          ) : (
            <p className="text-brand-text-dim py-16 text-center text-sm">
              {t('admin.loading')}
            </p>
          )}
        </main>
      </div>

      {notice && (
        <div
          role="status"
          className={cn(
            'fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-2 rounded-lg border py-2 pr-2 pl-4 text-sm leading-5 shadow-2xl backdrop-blur-md',
            notice.kind === 'ok'
              ? 'border-brand-green/40 bg-[#0c2a28]/90 text-white'
              : 'border-brand-red/50 bg-[#3a1020]/90 text-white',
          )}
        >
          <span className="flex-1">{notice.text}</span>
          <CloseButton onClick={() => setNotice(null)} />
        </div>
      )}
    </>
  )
}

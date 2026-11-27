import { useOutletContext } from 'react-router'

import type { Participant } from '@/components/admin/model'
import type { AdminData } from '@/lib/adminApi'

export type AdminContext = {
  data: AdminData
  participants: Participant[]
  busy: boolean
  /**
   * Runs a write, then reloads the data. Shows `success` on success and a
   * translated error otherwise; an expired session goes back to sign-in.
   * Resolves to whether the write succeeded.
   */
  run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>
  /** Shows a short confirmation that dismisses itself. */
  notify: (text: string) => void
}

/** Data and actions shared by every screen under AdminLayout. */
export function useAdmin(): AdminContext {
  return useOutletContext<AdminContext>()
}

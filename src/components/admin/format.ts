import { useTranslation } from 'react-i18next'

import { TIME_ZONE } from '@/components/admin/model'

export function useDateFormat(): (iso: string | null) => string {
  const { i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(
    i18n.resolvedLanguage === 'en' ? 'en-GB' : 'es-AR',
    { dateStyle: 'short', timeStyle: 'short', timeZone: TIME_ZONE },
  )
  return (iso) => {
    if (!iso) return ''
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso : format.format(date)
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

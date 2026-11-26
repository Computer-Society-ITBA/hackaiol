import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import es from './locales/es.json'

export const defaultNS = 'translation'

export const resources = {
  en: { translation: en },
  es: { translation: es },
} as const

const supportedLngs = ['es', 'en'] as const

// The language follows the browser: any Spanish (es-AR, es-ES...) gets
// Spanish, any English gets English, anything else falls back to Spanish.
// There is no switcher, so nothing is remembered. A ?lang=en link still
// forces a language, which is handy for testing.
//
// Search and link preview crawlers browse with English set, which would get
// the site indexed in English. They always get Spanish, the event's language.
const isCrawler =
  typeof navigator !== 'undefined' &&
  /bot|crawler|spider|slurp|facebookexternalhit|embedly|preview/i.test(
    navigator.userAgent,
  )

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: isCrawler ? 'es' : undefined,
    fallbackLng: 'es',
    supportedLngs: [...supportedLngs],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    defaultNS,
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'navigator'],
      lookupQuerystring: 'lang',
      caches: [],
    },
  })

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
syncHtmlLang(i18n.resolvedLanguage ?? 'es')
i18n.on('languageChanged', syncHtmlLang)

export default i18n

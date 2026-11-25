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

export const supportedLngs = ['es', 'en'] as const
export type SupportedLng = (typeof supportedLngs)[number]

// Spanish is the default for everyone. English is only used when someone
// picks it from the header switcher (remembered in localStorage) or opens
// a link with ?lang=en. The browser language is deliberately ignored.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: [...supportedLngs],
    defaultNS,
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
    },
  })

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
syncHtmlLang(i18n.resolvedLanguage ?? 'es')
i18n.on('languageChanged', syncHtmlLang)

export default i18n

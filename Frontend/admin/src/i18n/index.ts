import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import frJourney from './locales/fr/journey.json'
import enJourney from './locales/en/journey.json'
import frCommon from './locales/fr/common.json'
import enCommon from './locales/en/common.json'

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
const LANGUAGE_STORAGE_KEY = 'admin.lang'

function readPersistedLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'fr'
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === 'fr' || stored === 'en') return stored
  } catch {
    // localStorage may be unavailable (private mode) — fall through to default.
  }
  return 'fr'
}

/**
 * App-wide i18n bootstrap.
 *
 * - Default language: French (matches the existing UI vocabulary).
 * - Fallback: French as well, so missing English keys still render something
 *   useful while the English bundle catches up.
 * - Resources are eagerly registered for the journey + common namespaces because
 *   they are the most-traversed flows; new namespaces should be added with
 *   `addResourceBundle` on demand to avoid bloating the initial bundle.
 * - The current language is persisted to localStorage under `admin.lang` so
 *   the operator's choice survives page refreshes.
 */
export function initI18n() {
  if (i18n.isInitialized) return i18n
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { journey: frJourney, common: frCommon },
      en: { journey: enJourney, common: enCommon },
    },
    lng: readPersistedLanguage(),
    fallbackLng: 'fr',
    defaultNS: 'journey',
    ns: ['journey', 'common'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return i18n
}

export function setAppLanguage(lang: SupportedLanguage) {
  void i18n.changeLanguage(lang)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    } catch {
      // ignore — best-effort persistence
    }
  }
}

export default i18n

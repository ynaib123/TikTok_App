import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import frJourney from './locales/fr/journey.json'
import enJourney from './locales/en/journey.json'

/**
 * App-wide i18n bootstrap.
 *
 * - Default language: French (matches the existing UI vocabulary).
 * - Fallback: French as well, so missing English keys still render something
 *   useful while the English bundle catches up.
 * - Resources are eagerly registered for the journey namespace because that is
 *   the most-traversed flow; new namespaces should be added with `addResourceBundle`
 *   on demand to avoid bloating the initial bundle.
 */
export function initI18n() {
  if (i18n.isInitialized) return i18n
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { journey: frJourney },
      en: { journey: enJourney },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    defaultNS: 'journey',
    ns: ['journey'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return i18n
}

export default i18n

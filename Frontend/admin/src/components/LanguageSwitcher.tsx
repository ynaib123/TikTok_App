import { useTranslation } from 'react-i18next'

import { setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n'

/**
 * Compact FR / EN toggle pill rendered in the AdminShell header.
 * Persists the choice through {@link setAppLanguage} so refreshes keep the locale.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common')
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'fr') as SupportedLanguage

  return (
    <div
      role="group"
      aria-label={t('language.switchAria')}
      className="lang-switcher"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 2,
        borderRadius: 999,
        background: 'rgba(255, 255, 255, 0.06)',
      }}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang
        return (
          <button
            key={lang}
            type="button"
            aria-pressed={active}
            onClick={() => setAppLanguage(lang)}
            style={{
              minWidth: 32,
              padding: '2px 10px',
              borderRadius: 999,
              border: 'none',
              background: active ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: active ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              fontWeight: active ? 600 : 500,
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {lang}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher

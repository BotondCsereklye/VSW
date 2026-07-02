import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { I18nContext, type I18nContextValue } from './i18nContext'
import { translate } from './translate'
import { defaultLanguage, languages, type LanguageCode } from './translations'

const STORAGE_KEY = 'vsw-language'

type I18nProviderProps = {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(() => readStoredLanguage())

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage(nextLanguage) {
        const normalizedLanguage = isLanguageCode(nextLanguage)
          ? nextLanguage
          : defaultLanguage
        window.localStorage.setItem(STORAGE_KEY, normalizedLanguage)
        setLanguageState(normalizedLanguage)
      },
      t: (key, values) => translate(language, key, values),
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function readStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return defaultLanguage
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
  return isLanguageCode(storedLanguage) ? storedLanguage : defaultLanguage
}

function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && value in languages
}

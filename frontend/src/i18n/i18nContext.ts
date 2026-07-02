import { createContext } from 'react'

import { defaultLanguage, type LanguageCode, type TranslationKey } from './translations'
import { translate } from './translate'

export type I18nContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue>({
  language: defaultLanguage,
  setLanguage: () => undefined,
  t: (key, values) => translate(defaultLanguage, key, values),
})


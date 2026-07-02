import { defaultLanguage, translations, type LanguageCode, type TranslationKey } from './translations'

export function translate(
  language: LanguageCode,
  key: TranslationKey,
  values: Record<string, string | number> = {},
) {
  const template: string =
    translations[language]?.[key] ?? translations[defaultLanguage][key] ?? key
  return Object.entries(values).reduce<string>(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    template,
  )
}


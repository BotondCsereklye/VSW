import { getLanguageOptions } from '../i18n/translations'
import { useTranslation } from '../i18n/useTranslation'

export function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation()

  return (
    <label className="language-selector">
      <span>{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        aria-label={t('language.label')}
      >
        {getLanguageOptions().map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

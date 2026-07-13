import { getLanguageOptions } from '../i18n/translations'
import { useTranslation } from '../i18n/useTranslation'

export function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation()

  return (
    <div className="language-selector" role="group" aria-label={t('language.label')}>
      {getLanguageOptions().map((option) => (
        <button
          key={option.code}
          type="button"
          className="language-selector__option"
          aria-label={option.label}
          aria-pressed={language === option.code}
          title={option.label}
          onClick={() => setLanguage(option.code)}
        >
          <span aria-hidden="true">{option.shortLabel}</span>
        </button>
      ))}
    </div>
  )
}

import type { SafetyMessage } from '../safetyMessages'
import { useTranslation } from '../i18n/useTranslation'
import { NumericSettingInput } from './NumericSettingInput'

type SafetyMessagesPanelProps = {
  messages: SafetyMessage[]
  retentionMinutes: number
  onRetentionChange: (minutes: number) => void
}

export function SafetyMessagesPanel({
  messages,
  retentionMinutes,
  onRetentionChange,
}: SafetyMessagesPanelProps) {
  const { t } = useTranslation()

  return (
    <section className="safety-messages" aria-label={t('safety.aria')}>
      <header className="safety-messages__header">
        <div>
          <p className="safety-messages__eyebrow">{t('safety.eyebrow')}</p>
          <h2>{t('safety.title')}</h2>
          <p>{t('safety.description')}</p>
        </div>
        <label>
          <span>{t('safety.retention')}</span>
          <NumericSettingInput
            min={1}
            max={60}
            value={retentionMinutes}
            ariaLabel={t('safety.retention')}
            onCommit={onRetentionChange}
          />
          <span>{t('safety.minutes')}</span>
        </label>
      </header>

      {messages.length === 0 ? (
        <p className="safety-messages__empty">{t('safety.empty')}</p>
      ) : (
        <ul className="safety-messages__list">
          {messages.map((message) => (
            <li key={message.id}>
              <strong>{t('safety.notSafe', { target: message.target })}</strong>
              <span>
                {message.score !== null && message.minimumAllowedScore !== null
                  ? t('safety.scoreBelow', {
                      score: message.score,
                      minimum: message.minimumAllowedScore,
                    })
                  : message.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

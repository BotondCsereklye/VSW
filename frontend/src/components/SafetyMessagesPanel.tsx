import type { SafetyMessage } from '../safetyMessages'

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
  return (
    <section className="safety-messages" aria-label="Latest safety messages">
      <header className="safety-messages__header">
        <div>
          <p className="safety-messages__eyebrow">Latest visit gate messages</p>
          <h2>Recent blocked visits</h2>
          <p>
            Short-lived alerts stay here first. The related scan remains available in
            the score categories below.
          </p>
        </div>
        <label>
          <span>Show latest for</span>
          <input
            type="number"
            min="1"
            max="60"
            value={retentionMinutes}
            onChange={(event) => onRetentionChange(Number.parseInt(event.target.value || '5', 10))}
          />
          <span>min</span>
        </label>
      </header>

      {messages.length === 0 ? (
        <p className="safety-messages__empty">No recent blocked visits in this window.</p>
      ) : (
        <ul className="safety-messages__list">
          {messages.map((message) => (
            <li key={message.id}>
              <strong>Website not safe: {message.target}</strong>
              <span>
                {message.score !== null && message.minimumAllowedScore !== null
                  ? `Score ${message.score}/100 below minimum ${message.minimumAllowedScore}/100.`
                  : message.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

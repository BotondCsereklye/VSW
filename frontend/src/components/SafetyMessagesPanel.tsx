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
          <p className="safety-messages__eyebrow">Latest safety messages</p>
          <h2>Blocked visit reports</h2>
        </div>
        <label>
          <span>Auto-clear after</span>
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
        <p className="safety-messages__empty">No blocked visits in the current retention window.</p>
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

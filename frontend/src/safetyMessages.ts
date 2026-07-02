export type SafetyMessage = {
  id: string
  type: 'blocked'
  target: string
  message: string
  score: number | null
  minimumAllowedScore: number | null
  createdAt: number
}

const STORAGE_KEY = 'vswSafetyMessages'
const RETENTION_KEY = 'vswSafetyMessageRetentionMinutes'
const DEFAULT_RETENTION_MINUTES = 5

export function loadSafetyMessages(now = Date.now()) {
  return pruneSafetyMessages(readMessages(), getSafetyMessageRetentionMinutes(), now)
}

export function addSafetyMessage(message: SafetyMessage, now = Date.now()) {
  const messages = [message, ...loadSafetyMessages(now)]
    .filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 8)
  writeMessages(messages)
  return messages
}

export function pruneSafetyMessages(
  messages: SafetyMessage[],
  retentionMinutes: number,
  now = Date.now(),
) {
  const maxAgeMs = Math.max(1, retentionMinutes) * 60 * 1000
  return messages.filter((message) => now - message.createdAt <= maxAgeMs)
}

export function getSafetyMessageRetentionMinutes() {
  const parsed = Number.parseInt(
    window.localStorage.getItem(RETENTION_KEY) ?? String(DEFAULT_RETENTION_MINUTES),
    10,
  )
  if (Number.isNaN(parsed)) {
    return DEFAULT_RETENTION_MINUTES
  }
  return Math.min(60, Math.max(1, parsed))
}

export function setSafetyMessageRetentionMinutes(value: number) {
  const normalized = Math.min(60, Math.max(1, Math.round(value)))
  window.localStorage.setItem(RETENTION_KEY, String(normalized))
  writeMessages(pruneSafetyMessages(readMessages(), normalized))
  return normalized
}

function readMessages(): SafetyMessage[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isSafetyMessage)
  } catch {
    return []
  }
}

function writeMessages(messages: SafetyMessage[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

function isSafetyMessage(candidate: unknown): candidate is SafetyMessage {
  if (!candidate || typeof candidate !== 'object') {
    return false
  }
  const message = candidate as Partial<SafetyMessage>
  return (
    message.type === 'blocked' &&
    typeof message.id === 'string' &&
    typeof message.target === 'string' &&
    typeof message.message === 'string' &&
    typeof message.createdAt === 'number'
  )
}

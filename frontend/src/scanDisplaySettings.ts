const RECENT_SCAN_MINUTES_KEY = 'vswRecentScanMinutes'
const RECENT_SCAN_SEEN_KEY = 'vswRecentScanSeenAt'
const DEFAULT_RECENT_SCAN_MINUTES = 20

export function getRecentScanMinutes() {
  const parsed = Number.parseInt(
    window.localStorage.getItem(RECENT_SCAN_MINUTES_KEY) ?? String(DEFAULT_RECENT_SCAN_MINUTES),
    10,
  )

  return normalizeRecentScanMinutes(parsed)
}

export function setRecentScanMinutes(value: number) {
  const normalized = normalizeRecentScanMinutes(value)
  window.localStorage.setItem(RECENT_SCAN_MINUTES_KEY, String(normalized))
  return normalized
}

export function normalizeRecentScanMinutes(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_RECENT_SCAN_MINUTES
  }

  return Math.min(30, Math.max(1, Math.round(value)))
}

export function loadRecentScanSeenAt(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SCAN_SEEN_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => {
        const [, value] = entry
        return typeof value === 'number' && Number.isFinite(value)
      }),
    )
  } catch {
    return {}
  }
}

export function saveRecentScanSeenAt(seenAtByScanId: Record<string, number>) {
  window.localStorage.setItem(RECENT_SCAN_SEEN_KEY, JSON.stringify(seenAtByScanId))
}

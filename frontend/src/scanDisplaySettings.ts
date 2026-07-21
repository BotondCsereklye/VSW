const RECENT_SCAN_MINUTES_KEY = 'vswRecentScanMinutes'
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

  return Math.min(30, Math.max(10, Math.round(value)))
}

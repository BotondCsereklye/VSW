import type { ScanSummary } from './types/scan'

export type HostSummary = {
  host: string
  scanCount: number
  latestScore: number | null
  latestUpdatedAt: string
}

export function buildHostSummaries(scans: ScanSummary[]) {
  const summaries = new Map<string, HostSummary>()

  for (const scan of scans) {
    const host = normalizeHost(scan.normalized_target || scan.target)
    if (!host) {
      continue
    }

    const existing = summaries.get(host)
    if (!existing) {
      summaries.set(host, {
        host,
        scanCount: 1,
        latestScore: scan.score,
        latestUpdatedAt: scan.updated_at,
      })
      continue
    }

    existing.scanCount += 1
    if (new Date(scan.updated_at).getTime() >= new Date(existing.latestUpdatedAt).getTime()) {
      existing.latestScore = scan.score
      existing.latestUpdatedAt = scan.updated_at
    }
  }

  return Array.from(summaries.values()).sort((left, right) => {
    if (right.scanCount !== left.scanCount) {
      return right.scanCount - left.scanCount
    }
    return new Date(right.latestUpdatedAt).getTime() - new Date(left.latestUpdatedAt).getTime()
  })
}

export function toggleHost(list: string[], host: string) {
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) {
    return list
  }

  if (list.includes(normalizedHost)) {
    return list.filter((item) => item !== normalizedHost)
  }

  return [normalizedHost, ...list].slice(0, 50)
}

function normalizeHost(value: string) {
  return value.trim().toLowerCase()
}

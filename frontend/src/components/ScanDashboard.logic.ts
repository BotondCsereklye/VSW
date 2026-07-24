import type { ScanSummary } from '../types/scan'

export type ScanScoreBand = {
  id: string
  label: string
  description: string
  scans: ScanSummary[]
}

export type SplitScansByRecencyResult = {
  recentScans: ScanSummary[]
  archivedScans: ScanSummary[]
}

const SCORE_BANDS = [
  {
    id: 'score-75',
    label: '75+',
    description: 'Stable',
    matches: (scan: ScanSummary) => scan.score !== null && scan.score >= 75,
  },
  {
    id: 'score-50',
    label: '50+',
    description: 'Watch',
    matches: (scan: ScanSummary) => scan.score !== null && scan.score >= 50 && scan.score < 75,
  },
  {
    id: 'score-25',
    label: '25+',
    description: 'Weak',
    matches: (scan: ScanSummary) => scan.score !== null && scan.score >= 25 && scan.score < 50,
  },
  {
    id: 'score-0',
    label: '0+',
    description: 'Critical',
    matches: (scan: ScanSummary) => scan.score !== null && scan.score < 25,
  },
] as const

export function groupScansByScoreBand(scans: ScanSummary[]): ScanScoreBand[] {
  const inProgress = scans.filter((scan) => scan.score === null)
  const groups: ScanScoreBand[] = []

  if (inProgress.length > 0) {
    groups.push({
      id: 'in-progress',
      label: 'Pending',
      description: 'Running or waiting',
      scans: inProgress,
    })
  }

  for (const band of SCORE_BANDS) {
    const bandScans = scans.filter((scan) => band.matches(scan))
    if (bandScans.length > 0) {
      groups.push({
        id: band.id,
        label: band.label,
        description: band.description,
        scans: bandScans,
      })
    }
  }

  return groups
}

export function splitScansByRecency(
  scans: ScanSummary[],
  recentMinutes: number,
  now = Date.now(),
): SplitScansByRecencyResult {
  const maxAgeMs = Math.max(10, Math.min(30, recentMinutes)) * 60 * 1000
  const recentScans: ScanSummary[] = []
  const archivedScans: ScanSummary[] = []

  for (const scan of scans) {
    const activityAt = getLatestScanActivityTime(scan)
    const isRecent = Number.isFinite(activityAt) && now - activityAt <= maxAgeMs
    if (isRecent || scan.score === null) {
      recentScans.push(scan)
    } else {
      archivedScans.push(scan)
    }
  }

  return { recentScans, archivedScans }
}

function getLatestScanActivityTime(scan: ScanSummary) {
  return Math.max(
    ...[scan.updated_at, scan.completed_at, scan.started_at, scan.created_at]
      .map((value) => (value === null ? Number.NaN : Date.parse(value)))
      .filter((value) => Number.isFinite(value)),
  )
}

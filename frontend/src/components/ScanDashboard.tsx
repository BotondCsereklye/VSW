import type { ScanSummary } from '../types/scan'
import { ScanStatusBadge } from './ScanStatusBadge'
import { ScoreBadge } from './ScoreBadge'

type ScanDashboardProps = {
  scans: ScanSummary[]
  selectedScanId: string | null
  onSelectScan: (scanId: string) => void
}

export function ScanDashboard({
  scans,
  selectedScanId,
  onSelectScan,
}: ScanDashboardProps) {
  if (scans.length === 0) {
    return (
      <section className="scan-dashboard scan-dashboard--empty">
        <h2>No scans yet</h2>
        <p>Create a safe scan to generate your first report.</p>
      </section>
    )
  }

  return (
    <section className="scan-dashboard">
      <header className="scan-dashboard__header">
        <h2>Recent scans</h2>
      </header>
      <div className="scan-dashboard__list">
        {scans.map((scan) => (
          <article
            key={scan.id}
            className={`scan-row${selectedScanId === scan.id ? ' scan-row--active' : ''}`}
          >
            <div className="scan-row__main">
              <h3>{scan.target}</h3>
              <p>{scan.summary ?? 'Waiting for scan results.'}</p>
            </div>
            <div className="scan-row__meta">
              <ScanStatusBadge status={scan.status} />
              <ScoreBadge score={scan.score} />
              <button type="button" onClick={() => onSelectScan(scan.id)}>
                Open report for {scan.target}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

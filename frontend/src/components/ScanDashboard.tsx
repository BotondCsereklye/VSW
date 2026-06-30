import type { ScanSummary } from '../types/scan'
import { groupScansByScoreBand } from './ScanDashboard.logic'
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

  const groups = groupScansByScoreBand(scans)

  return (
    <section className="scan-dashboard">
      <header className="scan-dashboard__header">
        <h2>Recent scans</h2>
        <span>{scans.length} total</span>
      </header>
      <div className="scan-dashboard__list">
        {groups.map((group) => (
          <section key={group.id} className={`scan-dashboard__group scan-dashboard__group--${group.id}`}>
            <header className="scan-dashboard__group-header">
              <div>
                <h3>{group.label}</h3>
                <p>{group.description}</p>
              </div>
              <span>{group.scans.length}</span>
            </header>
            <div className="scan-dashboard__group-list">
              {group.scans.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => onSelectScan(scan.id)}
                  aria-label={`Open report for ${scan.target}`}
                  className={`scan-row${selectedScanId === scan.id ? ' scan-row--active' : ''}`}
                >
                  <div className="scan-row__main">
                    <h4>{scan.target}</h4>
                    <p>{scan.summary ?? 'Waiting for scan results.'}</p>
                  </div>
                  <div className="scan-row__meta">
                    <ScanStatusBadge status={scan.status} />
                    <ScoreBadge score={scan.score} />
                    <span className="scan-row__cta">Open report</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

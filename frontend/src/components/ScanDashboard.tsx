import type { ScanSummary } from '../types/scan'
import { useTranslation } from '../i18n/useTranslation'
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
  const { t } = useTranslation()

  if (scans.length === 0) {
    return (
      <section className="scan-dashboard scan-dashboard--empty">
        <h2>{t('dashboard.emptyTitle')}</h2>
        <p>{t('dashboard.emptyText')}</p>
      </section>
    )
  }

  const groups = groupScansByScoreBand(scans)

  return (
    <section className="scan-dashboard">
      <header className="scan-dashboard__header">
        <h2>{t('dashboard.title')}</h2>
        <span>{t('dashboard.total', { count: scans.length })}</span>
      </header>
      <div className="scan-dashboard__list">
        {groups.map((group) => (
          <details key={group.id} className={`scan-dashboard__group scan-dashboard__group--${group.id}`}>
            <summary className="scan-dashboard__group-header">
              <div>
                <h3>{group.label}</h3>
                <p>{group.description}</p>
              </div>
              <span>{group.scans.length}</span>
            </summary>
            <div className="scan-dashboard__group-list">
              {group.scans.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => onSelectScan(scan.id)}
                  aria-label={`${t('dashboard.openReport')} for ${scan.target}`}
                  className={`scan-row${selectedScanId === scan.id ? ' scan-row--active' : ''}`}
                >
                  <div className="scan-row__main">
                    <h4>{scan.target}</h4>
                    <p>{scan.summary ?? t('dashboard.waiting')}</p>
                  </div>
                  <div className="scan-row__meta">
                    <ScanStatusBadge status={scan.status} />
                    <ScoreBadge score={scan.score} />
                    <span className="scan-row__cta">{t('dashboard.openReport')}</span>
                  </div>
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

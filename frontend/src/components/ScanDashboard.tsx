import type { ScanSummary } from '../types/scan'
import { useTranslation } from '../i18n/useTranslation'
import { groupScansByScoreBand, splitScansByRecency } from './ScanDashboard.logic'
import { NumericSettingInput } from './NumericSettingInput'
import { ScanStatusBadge } from './ScanStatusBadge'
import { ScoreBadge } from './ScoreBadge'

type ScanDashboardProps = {
  scans: ScanSummary[]
  selectedScanId: string | null
  recentMinutes: number
  onRecentMinutesChange: (minutes: number) => void
  onSelectScan: (scanId: string) => void
}

export function ScanDashboard({
  scans,
  selectedScanId,
  recentMinutes,
  onRecentMinutesChange,
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

  const { recentScans, archivedScans } = splitScansByRecency(scans, recentMinutes)
  const groups = groupScansByScoreBand(archivedScans)
  const archivedCount = archivedScans.length

  return (
    <section className="scan-dashboard">
      <header className="scan-dashboard__header">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <label className="scan-dashboard__recent-setting">
            <span>{t('dashboard.recentRetention')}</span>
            <NumericSettingInput
              min={10}
              max={30}
              value={recentMinutes}
              ariaLabel={t('dashboard.recentAria')}
              onCommit={onRecentMinutesChange}
            />
            <span>min</span>
          </label>
        </div>
        <span>{t('dashboard.total', { count: scans.length })}</span>
      </header>
      <div className="scan-dashboard__list">
        <section className="scan-dashboard__recent">
          <header>
            <h3>{t('dashboard.recentInbox')}</h3>
            <span>{recentScans.length}</span>
          </header>
          {recentScans.length === 0 ? (
            <p>{t('dashboard.recentEmpty')}</p>
          ) : (
            <div className="scan-dashboard__group-list">
              {recentScans.map((scan) => (
                <ScanRow
                  key={scan.id}
                  scan={scan}
                  selectedScanId={selectedScanId}
                  onSelectScan={onSelectScan}
                  openLabel={t('dashboard.openReport')}
                  waitingLabel={t('dashboard.waiting')}
                />
              ))}
            </div>
          )}
        </section>
        <div className="scan-dashboard__category-title">
          <h3>{t('dashboard.scoreCategories')}</h3>
          <span>{t('dashboard.classified', { count: archivedCount })}</span>
        </div>
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
                <ScanRow
                  key={scan.id}
                  scan={scan}
                  selectedScanId={selectedScanId}
                  onSelectScan={onSelectScan}
                  openLabel={t('dashboard.openReport')}
                  waitingLabel={t('dashboard.waiting')}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

type ScanRowProps = {
  scan: ScanSummary
  selectedScanId: string | null
  openLabel: string
  waitingLabel: string
  onSelectScan: (scanId: string) => void
}

function ScanRow({
  scan,
  selectedScanId,
  openLabel,
  waitingLabel,
  onSelectScan,
}: ScanRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectScan(scan.id)}
      aria-label={`${openLabel} for ${scan.target}`}
      className={`scan-row${selectedScanId === scan.id ? ' scan-row--active' : ''}`}
    >
      <div className="scan-row__main">
        <h4>{scan.target}</h4>
        <p>{scan.summary ?? waitingLabel}</p>
      </div>
      <div className="scan-row__meta">
        <ScanStatusBadge status={scan.status} />
        <ScoreBadge score={scan.score} />
        <span className="scan-row__cta">{openLabel}</span>
      </div>
    </button>
  )
}

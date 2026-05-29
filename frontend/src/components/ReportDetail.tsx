import type { ScanDetail, ScanExportFormat, ScanSummary } from '../types/scan'
import { FindingCard } from './FindingCard'
import { ScoreBadge } from './ScoreBadge'

type ReportDetailProps = {
  scan: ScanDetail | null
  history?: ScanSummary[]
  onExport?: (format: ScanExportFormat) => void | Promise<void>
}

function getTrendLabel(history: ScanSummary[]): string {
  const completed = history.filter((item) => item.score !== null)
  if (completed.length < 2) {
    return 'Trend unavailable'
  }

  const [latest, previous] = completed
  if ((latest.score ?? 0) > (previous.score ?? 0)) {
    return 'Trend improving'
  }
  if ((latest.score ?? 0) < (previous.score ?? 0)) {
    return 'Trend degraded'
  }
  return 'Trend stable'
}

export function ReportDetail({ scan, history = [], onExport }: ReportDetailProps) {
  if (scan === null) {
    return (
      <section className="report-detail report-detail--empty">
        <h2>Report detail</h2>
        <p>Select a scan to inspect its findings.</p>
      </section>
    )
  }

  const trendLabel = getTrendLabel(history)

  return (
    <section className="report-detail">
      <header className="report-detail__header">
        <div>
          <h2>{scan.target}</h2>
          <p>{scan.summary ?? 'No report summary available.'}</p>
        </div>
        <div className="report-detail__header-actions">
          <ScoreBadge score={scan.score} />
          <div className="report-detail__exports">
            <button type="button" onClick={() => void onExport?.('json')}>
              Export JSON
            </button>
            <button type="button" onClick={() => void onExport?.('csv')}>
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <section className="report-detail__history">
        <div className="report-detail__history-header">
          <h3>Recent history</h3>
          <span className="report-detail__trend">{trendLabel}</span>
        </div>
        {history.length > 0 ? (
          <div className="report-detail__history-list">
            {history.map((item) => (
              <article key={item.id} className="report-detail__history-item">
                <strong>{item.created_at.slice(0, 10)}</strong>
                <span>{item.status}</span>
                <span>{item.score ?? 'pending'}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>No previous scans available for this target.</p>
        )}
      </section>

      <div className="report-detail__snapshot">
        <article>
          <h3>TLS</h3>
          <pre>{JSON.stringify(scan.snapshot?.tls_analysis ?? {}, null, 2)}</pre>
        </article>
        <article>
          <h3>Headers</h3>
          <pre>{JSON.stringify(scan.snapshot?.http_headers ?? {}, null, 2)}</pre>
        </article>
      </div>

      <div className="report-detail__findings">
        {scan.findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </section>
  )
}

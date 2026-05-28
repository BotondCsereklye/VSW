import type { ScanDetail } from '../types/scan'
import { FindingCard } from './FindingCard'
import { ScoreBadge } from './ScoreBadge'

type ReportDetailProps = {
  scan: ScanDetail | null
}

export function ReportDetail({ scan }: ReportDetailProps) {
  if (scan === null) {
    return (
      <section className="report-detail report-detail--empty">
        <h2>Report detail</h2>
        <p>Select a scan to inspect its findings.</p>
      </section>
    )
  }

  return (
    <section className="report-detail">
      <header className="report-detail__header">
        <div>
          <h2>{scan.target}</h2>
          <p>{scan.summary ?? 'No report summary available.'}</p>
        </div>
        <ScoreBadge score={scan.score} />
      </header>

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

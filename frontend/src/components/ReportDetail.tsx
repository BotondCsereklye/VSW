import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ScanDetail, ScanExportFormat, ScanSummary } from '../types/scan'
import { FindingCard } from './FindingCard'
import { ScoreBadge } from './ScoreBadge'

type ReportDetailProps = {
  scan: ScanDetail | null
  history?: ScanSummary[]
  onExport?: (format: ScanExportFormat) => void | Promise<void>
}

type SnapshotPanel = 'tls' | 'headers'

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
  const [activeSnapshotPanel, setActiveSnapshotPanel] = useState<SnapshotPanel | null>(null)

  const snapshotTitle = activeSnapshotPanel === 'tls' ? 'TLS details' : 'Header details'
  const snapshotContent = useMemo(() => {
    if (scan === null || activeSnapshotPanel === null) {
      return null
    }

    if (activeSnapshotPanel === 'tls') {
      return scan.snapshot?.tls_analysis ?? {}
    }
    return scan.snapshot?.http_headers ?? {}
  }, [activeSnapshotPanel, scan])

  useEffect(() => {
    if (activeSnapshotPanel === null) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveSnapshotPanel(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [activeSnapshotPanel])

  if (scan === null) {
    return (
      <section className="report-detail report-detail--empty">
        <h2>Report detail</h2>
        <p>Select a scan to inspect its findings.</p>
      </section>
    )
  }

  const trendLabel = getTrendLabel(history)

  const snapshotModal =
    activeSnapshotPanel !== null && snapshotContent !== null
      ? createPortal(
          <div
            className="report-detail__modal-backdrop"
            onClick={() => setActiveSnapshotPanel(null)}
            role="presentation"
          >
            <section
              className="report-detail__modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="snapshot-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="report-detail__modal-header">
                <h3 id="snapshot-modal-title">{snapshotTitle}</h3>
                <button
                  type="button"
                  className="report-detail__modal-close"
                  aria-label="Close details"
                  onClick={() => setActiveSnapshotPanel(null)}
                >
                  X
                </button>
              </header>
              <pre>{JSON.stringify(snapshotContent, null, 2)}</pre>
            </section>
          </div>,
          document.body,
        )
      : null

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

      <div className="report-detail__snapshot-actions">
        <button type="button" onClick={() => setActiveSnapshotPanel('tls')}>
          TLS ansehen
        </button>
        <button type="button" onClick={() => setActiveSnapshotPanel('headers')}>
          Headers ansehen
        </button>
      </div>

      <div className="report-detail__findings">
        {scan.findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>

      {snapshotModal}
    </section>
  )
}

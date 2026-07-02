import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useTranslation } from '../i18n/useTranslation'
import type { TranslationKey } from '../i18n/translations'
import type { ScanDetail, ScanExportFormat, ScanSummary } from '../types/scan'
import { FindingCard } from './FindingCard'
import { ScoreBadge } from './ScoreBadge'

type ReportDetailProps = {
  scan: ScanDetail | null
  history?: ScanSummary[]
  onExport?: (format: ScanExportFormat) => void | Promise<void>
  discoveredLinks?: string[]
  checkedLinks?: string[]
  onInspectLink?: (link: string) => void | Promise<void>
}

type SnapshotPanel = 'tls' | 'headers'

function getTrendKey(history: ScanSummary[]): TranslationKey {
  const completed = history.filter((item) => item.score !== null)
  if (completed.length < 2) {
    return 'trend.unavailable'
  }

  const [latest, previous] = completed
  if ((latest.score ?? 0) > (previous.score ?? 0)) {
    return 'trend.improving'
  }
  if ((latest.score ?? 0) < (previous.score ?? 0)) {
    return 'trend.degraded'
  }
  return 'trend.stable'
}

export function ReportDetail({
  scan,
  history = [],
  onExport,
  discoveredLinks = [],
  checkedLinks = [],
  onInspectLink,
}: ReportDetailProps) {
  const { t } = useTranslation()
  const [activeSnapshotPanel, setActiveSnapshotPanel] = useState<SnapshotPanel | null>(null)
  const [expandedFindingsForScanId, setExpandedFindingsForScanId] = useState<string | null>(null)

  const snapshotTitle = activeSnapshotPanel === 'tls' ? t('report.tls') : t('report.headers')
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
        <h2>{t('report.emptyTitle')}</h2>
        <p>{t('report.emptyText')}</p>
      </section>
    )
  }

  const trendLabel = t(getTrendKey(history))
  const showAllFindings = expandedFindingsForScanId === scan.id
  const visibleFindings = showAllFindings ? scan.findings : scan.findings.slice(0, 3)
  const hiddenFindings = Math.max(scan.findings.length - visibleFindings.length, 0)

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
                  aria-label={t('report.closeDetails')}
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
          <p>{scan.summary ?? t('report.noSummary')}</p>
        </div>
        <div className="report-detail__header-actions">
          <ScoreBadge score={scan.score} />
          <div className="report-detail__exports">
            <button type="button" onClick={() => void onExport?.('json')}>
              {t('report.exportJson')}
            </button>
            <button type="button" onClick={() => void onExport?.('csv')}>
              {t('report.exportCsv')}
            </button>
          </div>
        </div>
      </header>

      <section className="report-detail__history">
        <div className="report-detail__history-header">
          <h3>{t('report.history')}</h3>
          <span className="report-detail__trend">{trendLabel}</span>
        </div>
        {history.length > 0 ? (
          <div className="report-detail__history-list">
            {history.map((item) => (
              <article key={item.id} className="report-detail__history-item">
                <strong>{item.created_at.slice(0, 10)}</strong>
                <span>{item.status}</span>
                <span>{item.score ?? t('report.pending')}</span>
              </article>
            ))}
          </div>
        ) : (
          <p>{t('report.noHistory')}</p>
        )}
      </section>

      <div className="report-detail__snapshot-actions">
        <button type="button" onClick={() => setActiveSnapshotPanel('tls')}>
          {t('report.tlsButton')}
        </button>
        <button type="button" onClick={() => setActiveSnapshotPanel('headers')}>
          {t('report.headersButton')}
        </button>
      </div>

      <div className="report-detail__findings">
        {visibleFindings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
        {scan.findings.length > 3 ? (
          <button
            type="button"
            className="report-detail__findings-toggle"
            onClick={() =>
              setExpandedFindingsForScanId((previous) => (previous === scan.id ? null : scan.id))
            }
          >
            {showAllFindings
              ? t('report.showLess')
              : t('report.showMore', { count: hiddenFindings })}
          </button>
        ) : null}
      </div>

      <section className="report-detail__link-checks">
        <header className="report-detail__link-checks-header">
          <h3>{t('report.linkChecks')}</h3>
          <span>{t('report.links', { count: discoveredLinks.length })}</span>
        </header>
        <p>{t('report.linkHelp')}</p>
        {discoveredLinks.length > 0 ? (
          <ul className="report-detail__link-list">
            {discoveredLinks.map((link) => (
              <li key={link} className="report-detail__link-item">
                <a href={link} target="_blank" rel="noreferrer">
                  {link}
                </a>
                <div className="report-detail__link-actions">
                  {checkedLinks.includes(link) ? (
                    <span className="report-detail__link-checked">{t('report.checked')}</span>
                  ) : null}
                  <button type="button" onClick={() => void onInspectLink?.(link)}>
                    {t('report.checkLink')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('report.noLinks')}</p>
        )}
      </section>

      {snapshotModal}
    </section>
  )
}

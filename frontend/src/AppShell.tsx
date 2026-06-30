import { startTransition, useEffect, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

import {
  createScan,
  discoverScanLinks,
  exportScan,
  getScanDetail,
  getScanHistory,
  listScans,
} from './api/client'
import { ExtensionSettingsPanel } from './components/ExtensionSettingsPanel'
import { ReportDetail } from './components/ReportDetail'
import { ScanDashboard } from './components/ScanDashboard'
import { TargetInput } from './components/TargetInput'
import type { ScanDetail, ScanExportFormat, ScanSummary } from './types/scan'

const ACTIVE_SCAN_POLL_INTERVAL_MS = 1500

function isScanInProgress(status: ScanSummary['status'] | null | undefined) {
  return status === 'pending' || status === 'running'
}


export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const matchedRoute = matchPath('/scans/:scanId', location.pathname)
  const scanId = matchedRoute?.params.scanId ?? null
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanSummary[]>([])
  const [discoveredLinks, setDiscoveredLinks] = useState<string[]>([])
  const [checkedLinks, setCheckedLinks] = useState<string[]>([])
  const [isLoadingScans, setIsLoadingScans] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasActiveScans = scans.some((scan) => isScanInProgress(scan.status))
  const shouldPollSelectedScan =
    scanId !== null &&
    selectedScan?.id === scanId &&
    isScanInProgress(selectedScan.status)

  useEffect(() => {
    let isActive = true

    async function loadScans() {
      try {
        const response = await listScans()
        if (!isActive) {
          return
        }

        startTransition(() => {
          setScans(response)
          setErrorMessage(null)
        })
      } catch {
        if (isActive) {
          setErrorMessage('Unable to load scans.')
        }
      } finally {
        if (isActive) {
          setIsLoadingScans(false)
        }
      }
    }

    void loadScans()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!hasActiveScans) {
      return
    }

    let isActive = true

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const response = await listScans()
          if (!isActive) {
            return
          }

          startTransition(() => {
            setScans(response)
            setErrorMessage(null)
          })
        } catch {
          if (isActive) {
            setErrorMessage('Unable to refresh scans.')
          }
        }
      })()
    }, ACTIVE_SCAN_POLL_INTERVAL_MS)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [hasActiveScans])

  useEffect(() => {
    if (!scanId) {
      return
    }

    let isActive = true
    const activeScanId = scanId

    async function loadScanDetail() {
      try {
        const [detailResponse, historyResponse, linkResponse] = await Promise.all([
          getScanDetail(activeScanId),
          getScanHistory(activeScanId),
          discoverScanLinks(activeScanId).catch(() => ({ links: [] })),
        ])
        if (!isActive) {
          return
        }

        startTransition(() => {
          setSelectedScan(detailResponse)
          setScanHistory(historyResponse)
          setDiscoveredLinks(linkResponse.links)
          setCheckedLinks([])
          setErrorMessage(null)
        })
      } catch {
        if (isActive) {
          setErrorMessage('Unable to load report details.')
        }
      }
    }

    void loadScanDetail()

    return () => {
      isActive = false
    }
  }, [scanId])

  useEffect(() => {
    if (!scanId || !shouldPollSelectedScan) {
      return
    }

    let isActive = true
    const activeScanId = scanId

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const [detailResponse, historyResponse, linkResponse] = await Promise.all([
            getScanDetail(activeScanId),
            getScanHistory(activeScanId),
            discoverScanLinks(activeScanId).catch(() => ({ links: [] })),
          ])
          if (!isActive) {
            return
          }

          startTransition(() => {
            setSelectedScan(detailResponse)
            setScanHistory(historyResponse)
            setDiscoveredLinks(linkResponse.links)
            setErrorMessage(null)
          })
        } catch {
          if (isActive) {
            setErrorMessage('Unable to load report details.')
          }
        }
      })()
    }, ACTIVE_SCAN_POLL_INTERVAL_MS)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [scanId, shouldPollSelectedScan])

  async function createScanAndNavigate(target: string): Promise<boolean> {
    setIsSubmitting(true)
    setIsLoadingScans(true)
    try {
      const createdScan = await createScan(target)
      const refreshedScans = await listScans()
      startTransition(() => {
        setScans(refreshedScans)
        setErrorMessage(null)
      })
      navigate(`/scans/${createdScan.id}`)
      return true
    } catch {
      setErrorMessage('Unable to create a scan right now.')
      return false
    } finally {
      setIsLoadingScans(false)
      setIsSubmitting(false)
    }
  }

  async function handleCreateScan(target: string) {
    await createScanAndNavigate(target)
  }

  function handleSelectScan(nextScanId: string) {
    navigate(`/scans/${nextScanId}`)
  }

  async function handleExport(format: ScanExportFormat) {
    if (!scanId) {
      return
    }

    try {
      const { blob, filename } = await exportScan(scanId, format)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setErrorMessage('Unable to export the selected report.')
    }
  }

  async function handleInspectLink(link: string) {
    const hostname = extractHostname(link)
    if (!hostname) {
      setErrorMessage('Unable to scan this link target.')
      return
    }

    const created = await createScanAndNavigate(hostname)
    if (!created) {
      return
    }
    setCheckedLinks((previous) => {
      if (previous.includes(link)) {
        return previous
      }
      return [link, ...previous].slice(0, 20)
    })
  }

  return (
    <main className="app-shell">
      <header className="app-shell__hero">
        <div>
          <p className="eyebrow">Defensive Vulnerability Scanner</p>
          <h1>Risk-focused visibility for the systems you are authorized to assess.</h1>
        </div>
        <TargetInput isSubmitting={isSubmitting} onSubmit={handleCreateScan} />
      </header>

      {errorMessage ? <p className="app-shell__error">{errorMessage}</p> : null}

      <ExtensionSettingsPanel />

      <section className="app-shell__content">
        <div className="app-shell__panel">
          {isLoadingScans ? (
            <p>Loading scans…</p>
          ) : (
            <ScanDashboard
              scans={scans}
              selectedScanId={scanId ?? null}
              onSelectScan={handleSelectScan}
            />
          )}
        </div>
        <div className="app-shell__panel">
          <ReportDetail
            scan={scanId ? selectedScan : null}
            history={scanId ? scanHistory : []}
            onExport={handleExport}
            discoveredLinks={scanId ? discoveredLinks : []}
            checkedLinks={checkedLinks}
            onInspectLink={handleInspectLink}
          />
        </div>
      </section>
    </main>
  )
}

function extractHostname(link: string): string | null {
  try {
    return new URL(link).hostname || null
  } catch {
    return null
  }
}

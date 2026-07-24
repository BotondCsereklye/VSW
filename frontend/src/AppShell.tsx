import { startTransition, useCallback, useEffect, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

import {
  ApiError,
  createScan,
  discoverScanLinks,
  exportScan,
  getScanDetail,
  getScanHistory,
  listScans,
} from './api/client'
import { ExtensionSettingsPanel } from './components/ExtensionSettingsPanel'
import { LanguageSelector } from './components/LanguageSelector'
import { ReportDetail } from './components/ReportDetail'
import { SafetyMessagesPanel } from './components/SafetyMessagesPanel'
import { ScanDashboard } from './components/ScanDashboard'
import { TargetInput } from './components/TargetInput'
import { ThemeToggle } from './components/ThemeToggle'
import { useTranslation } from './i18n/useTranslation'
import {
  addSafetyMessage,
  getSafetyMessageRetentionMinutes,
  loadSafetyMessages,
  setSafetyMessageRetentionMinutes,
  type SafetyMessage,
} from './safetyMessages'
import { getRecentScanMinutes, setRecentScanMinutes } from './scanDisplaySettings'
import type { ScanDetail, ScanExportFormat, ScanSummary } from './types/scan'

const ACTIVE_SCAN_POLL_INTERVAL_MS = 1500
const SAFETY_MESSAGE_PRUNE_INTERVAL_MS = 30_000
const BACKEND_OFFLINE_MESSAGE = 'Backend is offline. Start VSW Launcher or backend to continue.'

function isScanInProgress(status: ScanSummary['status'] | null | undefined) {
  return status === 'pending' || status === 'running'
}


export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const matchedRoute = matchPath('/scans/:scanId', location.pathname)
  const scanId = matchedRoute?.params.scanId ?? null
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanSummary[]>([])
  const [discoveredLinks, setDiscoveredLinks] = useState<string[]>([])
  const [checkedLinks, setCheckedLinks] = useState<string[]>([])
  const [isLoadingScans, setIsLoadingScans] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>(
    'checking',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [safetyMessages, setSafetyMessages] = useState<SafetyMessage[]>(() =>
    loadSafetyMessages(),
  )
  const [safetyRetentionMinutes, setSafetyRetentionMinutes] = useState(() =>
    getSafetyMessageRetentionMinutes(),
  )
  const [recentScanMinutes, setRecentScanMinutesState] = useState(() => getRecentScanMinutes())
  const hasActiveScans = scans.some((scan) => isScanInProgress(scan.status))
  const shouldPollSelectedScan =
    scanId !== null &&
    selectedScan?.id === scanId &&
    isScanInProgress(selectedScan.status)
  const visibleErrorMessage = errorMessage === BACKEND_OFFLINE_MESSAGE ? null : errorMessage

  const refreshScans = useCallback(async () => {
    setIsLoadingScans(true)
    setConnectionStatus('checking')
    try {
      const response = await listScans()
      startTransition(() => {
        setScans(response)
        setErrorMessage(null)
        setConnectionStatus('online')
      })
    } catch {
      startTransition(() => {
        setScans([])
        setSelectedScan(null)
        setScanHistory([])
        setDiscoveredLinks([])
        setCheckedLinks([])
        setConnectionStatus('offline')
        setErrorMessage(BACKEND_OFFLINE_MESSAGE)
      })
    } finally {
      setIsLoadingScans(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('notice') !== 'blocked') {
      return
    }

    const createdAt = Number.parseInt(params.get('ts') ?? '', 10) || Date.now()
    const nextMessage: SafetyMessage = {
      id: `${params.get('target') ?? 'unknown'}-${createdAt}`,
      type: 'blocked',
      target: params.get('target') ?? 'unknown target',
      message: params.get('message') ?? 'Website blocked by VSW.',
      score: parseNullableNumber(params.get('score')),
      minimumAllowedScore: parseNullableNumber(params.get('minimum')),
      createdAt,
    }
    const timeoutId = window.setTimeout(() => {
      setSafetyMessages(addSafetyMessage(nextMessage))
      navigate(location.pathname, { replace: true })
    }, 0)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSafetyMessages(loadSafetyMessages())
    }, SAFETY_MESSAGE_PRUNE_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshScans()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [refreshScans])

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
            setConnectionStatus('offline')
            setErrorMessage(BACKEND_OFFLINE_MESSAGE)
          }
        }
      })()
    }, ACTIVE_SCAN_POLL_INTERVAL_MS)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [hasActiveScans, t])

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
          setConnectionStatus('offline')
          setErrorMessage(t('error.loadDetails'))
        }
      }
    }

    void loadScanDetail()

    return () => {
      isActive = false
    }
  }, [scanId, t])

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
              setConnectionStatus('offline')
              setErrorMessage(t('error.loadDetails'))
          }
        }
      })()
    }, ACTIVE_SCAN_POLL_INTERVAL_MS)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [scanId, shouldPollSelectedScan, t])

  async function createScanAndNavigate(target: string): Promise<boolean> {
    setIsSubmitting(true)
    setIsLoadingScans(true)
    try {
      const createdScan = await createScan(target)
      const refreshedScans = await listScans()
      startTransition(() => {
        setScans(refreshedScans)
        setErrorMessage(null)
        setConnectionStatus('online')
      })
      navigate(`/scans/${createdScan.id}`)
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) {
        setConnectionStatus('online')
      } else {
        setConnectionStatus('offline')
      }
      setErrorMessage(t('error.createScan'))
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

  function handleSafetyRetentionChange(minutes: number) {
    const normalizedMinutes = setSafetyMessageRetentionMinutes(minutes)
    setSafetyRetentionMinutes(normalizedMinutes)
    setSafetyMessages(loadSafetyMessages())
  }

  function handleRecentScanMinutesChange(minutes: number) {
    setRecentScanMinutesState(setRecentScanMinutes(minutes))
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
      setErrorMessage(t('error.export'))
    }
  }

  async function handleInspectLink(link: string) {
    const hostname = extractHostname(link)
    if (!hostname) {
      setErrorMessage(t('error.linkTarget'))
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
          <div className="app-shell__topline">
            <div className="app-shell__brand">
              <img src="/vsw-logo.svg" alt="" aria-hidden="true" />
              <p className="eyebrow">{t('hero.eyebrow')}</p>
            </div>
            <div className="app-shell__actions">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
          <h1>{t('hero.title')}</h1>
        </div>
        <TargetInput isSubmitting={isSubmitting} onSubmit={handleCreateScan} />
      </header>

      <section className="app-shell__connection" data-state={connectionStatus}>
        <span>
          {connectionStatus === 'online'
            ? 'Backend online'
            : connectionStatus === 'offline'
              ? BACKEND_OFFLINE_MESSAGE
              : 'Checking backend...'}
        </span>
        {connectionStatus === 'offline' ? (
          <button type="button" onClick={() => void refreshScans()}>
            Reconnect
          </button>
        ) : null}
      </section>

      {visibleErrorMessage ? <p className="app-shell__error">{visibleErrorMessage}</p> : null}

      <ExtensionSettingsPanel scans={scans} />

      <section className="app-shell__content">
        <div className="app-shell__panel">
          <SafetyMessagesPanel
            messages={safetyMessages}
            retentionMinutes={safetyRetentionMinutes}
            onRetentionChange={handleSafetyRetentionChange}
          />
          {isLoadingScans ? (
            <p>{t('loading.scans')}</p>
          ) : (
            <ScanDashboard
              scans={scans}
              selectedScanId={scanId ?? null}
              recentMinutes={recentScanMinutes}
              onRecentMinutesChange={handleRecentScanMinutesChange}
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

function parseNullableNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

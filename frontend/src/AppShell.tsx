import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'

import { createScan, getScanDetail, listScans } from './api/client'
import { ReportDetail } from './components/ReportDetail'
import { ScanDashboard } from './components/ScanDashboard'
import { TargetInput } from './components/TargetInput'
import { ScanDetail, ScanSummary } from './types/scan'


export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const matchedRoute = matchPath('/scans/:scanId', location.pathname)
  const scanId = matchedRoute?.params.scanId ?? null
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null)
  const [isLoadingScans, setIsLoadingScans] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadScans = useEffectEvent(async () => {
    setIsLoadingScans(true)
    try {
      const response = await listScans()
      startTransition(() => {
        setScans(response)
        setErrorMessage(null)
      })
    } catch {
      setErrorMessage('Unable to load scans.')
    } finally {
      setIsLoadingScans(false)
    }
  })

  const loadScanDetail = useEffectEvent(async (activeScanId: string) => {
    try {
      const response = await getScanDetail(activeScanId)
      startTransition(() => {
        setSelectedScan(response)
        setErrorMessage(null)
      })
    } catch {
      setErrorMessage('Unable to load report details.')
    }
  })

  useEffect(() => {
    void loadScans()
  }, [])

  useEffect(() => {
    if (!scanId) {
      setSelectedScan(null)
      return
    }

    void loadScanDetail(scanId)
  }, [scanId])

  async function handleCreateScan(target: string) {
    setIsSubmitting(true)
    try {
      const createdScan = await createScan(target)
      await loadScans()
      navigate(`/scans/${createdScan.id}`)
    } catch {
      setErrorMessage('Unable to create a scan right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSelectScan(nextScanId: string) {
    navigate(`/scans/${nextScanId}`)
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
          <ReportDetail scan={selectedScan} />
        </div>
      </section>
    </main>
  )
}

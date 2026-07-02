import { useEffect, useState } from 'react'

import {
  getExtensionSettings,
  normalizeExtensionSettings,
  normalizeMinimumScore,
  setExtensionSettings,
  type ExtensionSettings,
} from '../extensionSettings'
import { buildHostSummaries, toggleHost } from '../hostRules'
import { useTranslation } from '../i18n/useTranslation'
import type { ScanSummary } from '../types/scan'

const EXTENSION_RETRY_INTERVAL_MS = 2000

type ExtensionSettingsPanelProps = {
  scans: ScanSummary[]
}

export function ExtensionSettingsPanel({ scans }: ExtensionSettingsPanelProps) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<ExtensionSettings>(() =>
    normalizeExtensionSettings(null),
  )
  const [status, setStatus] = useState(t('extension.checking'))
  const [isAvailable, setIsAvailable] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isActive = true
    let retryId: number | null = null

    async function loadSettings() {
      try {
        const nextSettings = await getExtensionSettings()
        if (!isActive) {
          return
        }
        setSettings(nextSettings)
        setIsAvailable(true)
        setStatus(t('extension.connected'))
      } catch {
        if (!isActive) {
          return
        }
        setIsAvailable(false)
        setStatus(t('extension.disconnected'))
        retryId = window.setTimeout(loadSettings, EXTENSION_RETRY_INTERVAL_MS)
      }
    }

    void loadSettings()

    return () => {
      isActive = false
      if (retryId !== null) {
        window.clearTimeout(retryId)
      }
    }
  }, [t])

  async function updateSettings(nextSettings: ExtensionSettings) {
    const normalized = normalizeExtensionSettings(nextSettings)
    setSettings(normalized)

    if (!isAvailable) {
      return
    }

    setIsSaving(true)
    try {
      const savedSettings = await setExtensionSettings(normalized)
      setSettings(savedSettings)
      setStatus(t('extension.saved'))
    } catch {
      setStatus(t('extension.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const hostSummaries = buildHostSummaries(scans).slice(0, 8)

  function updateTrustedHost(host: string) {
    const trustedHosts = toggleHost(settings.trustedHosts, host)
    void updateSettings({ ...settings, trustedHosts })
  }

  function updateScoreIgnoredHost(host: string) {
    const scoreGateIgnoredHosts = toggleHost(settings.scoreGateIgnoredHosts, host)
    void updateSettings({ ...settings, scoreGateIgnoredHosts })
  }

  return (
    <section className="extension-settings" aria-label={t('extension.title')}>
      <div>
        <p className="extension-settings__eyebrow">{t('extension.eyebrow')}</p>
        <h2>{t('extension.title')}</h2>
        <p>{t('extension.description')}</p>
      </div>

      <div className="extension-settings__controls">
        <label className="extension-settings__toggle">
          <input
            type="checkbox"
            checked={settings.liveCaptureEnabled}
            onChange={(event) =>
              void updateSettings({ ...settings, liveCaptureEnabled: event.target.checked })
            }
          />
          <span>{t('extension.liveCapture')}</span>
        </label>

        <label className="extension-settings__toggle">
          <input
            type="checkbox"
            checked={settings.blockOnScanFailure}
            onChange={(event) =>
              void updateSettings({ ...settings, blockOnScanFailure: event.target.checked })
            }
          />
          <span>{t('extension.blockFailure')}</span>
        </label>

        <label className="extension-settings__score">
          <span>{t('extension.minimumScore')}</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={settings.minimumAllowedScore}
            onChange={(event) =>
              void updateSettings({
                ...settings,
                minimumAllowedScore: normalizeMinimumScore(event.target.value),
              })
            }
          />
        </label>

        <label className="extension-settings__toggle">
          <input
            type="checkbox"
            checked={settings.blockBelowMinimumScore}
            onChange={(event) =>
              void updateSettings({ ...settings, blockBelowMinimumScore: event.target.checked })
            }
          />
          <span>{t('extension.blockScore')}</span>
        </label>
      </div>

      <details className="extension-settings__hosts">
        <summary>
          <span>{t('extension.rules')}</span>
          <strong>{t('extension.hosts', { count: hostSummaries.length })}</strong>
        </summary>
        <p>{t('extension.rulesHelp')}</p>
        {hostSummaries.length === 0 ? (
          <p className="extension-settings__empty">{t('extension.noHosts')}</p>
        ) : (
          <ul className="extension-settings__host-list">
            {hostSummaries.map((summary) => (
              <li key={summary.host}>
                <div>
                  <strong>{summary.host}</strong>
                  <span>
                    {t('extension.scans', { count: summary.scanCount })}
                    {summary.latestScore !== null
                      ? `, ${t('extension.latestScore', { score: summary.latestScore })}`
                      : ''}
                  </span>
                </div>
                <div className="extension-settings__host-actions">
                  <button
                    type="button"
                    aria-pressed={settings.scoreGateIgnoredHosts.includes(summary.host)}
                    onClick={() => updateScoreIgnoredHost(summary.host)}
                  >
                    {t('extension.ignoreScore')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={settings.trustedHosts.includes(summary.host)}
                    onClick={() => updateTrustedHost(summary.host)}
                  >
                    {t('extension.trustSite')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </details>

      <p className="extension-settings__status" data-state={isAvailable ? 'ok' : 'warning'}>
        {isSaving ? t('extension.saving') : status}
      </p>
    </section>
  )
}

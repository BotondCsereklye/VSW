import { useEffect, useState } from 'react'

import {
  getExtensionSettings,
  normalizeExtensionSettings,
  normalizeMinimumScore,
  setExtensionSettings,
  type ExtensionSettings,
} from '../extensionSettings'

const EXTENSION_RETRY_INTERVAL_MS = 2000

export function ExtensionSettingsPanel() {
  const [settings, setSettings] = useState<ExtensionSettings>(() =>
    normalizeExtensionSettings(null),
  )
  const [status, setStatus] = useState('Checking extension connection...')
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
        setStatus('Extension connected. Settings are synced.')
      } catch {
        if (!isActive) {
          return
        }
        setIsAvailable(false)
        setStatus('Extension not connected yet. Reload the extension or wait for reconnect.')
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
  }, [])

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
      setStatus('Extension settings saved.')
    } catch {
      setStatus('Could not save extension settings. Reload the extension and the VSW app.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="extension-settings" aria-label="Browser extension settings">
      <div>
        <p className="extension-settings__eyebrow">Browser protection</p>
        <h2>Visit gate settings</h2>
        <p>
          Configure when the VSW Link Capture extension should block a page visit after
          the defensive pre-scan.
        </p>
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
          <span>Enable live click capture</span>
        </label>

        <label className="extension-settings__toggle">
          <input
            type="checkbox"
            checked={settings.blockOnScanFailure}
            onChange={(event) =>
              void updateSettings({ ...settings, blockOnScanFailure: event.target.checked })
            }
          />
          <span>Block when the pre-scan fails</span>
        </label>

        <label className="extension-settings__score">
          <span>Minimum allowed score</span>
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
          <span>Block visits below the minimum score</span>
        </label>
      </div>

      <p className="extension-settings__status" data-state={isAvailable ? 'ok' : 'warning'}>
        {isSaving ? 'Saving...' : status}
      </p>
    </section>
  )
}

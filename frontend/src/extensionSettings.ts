export type ExtensionSettings = {
  liveCaptureEnabled: boolean
  blockOnScanFailure: boolean
  minimumAllowedScore: number
  blockBelowMinimumScore: boolean
  trustedHosts: string[]
  scoreGateIgnoredHosts: string[]
}

const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  liveCaptureEnabled: true,
  blockOnScanFailure: true,
  minimumAllowedScore: 50,
  blockBelowMinimumScore: true,
  trustedHosts: [],
  scoreGateIgnoredHosts: [],
}

const REQUEST_TIMEOUT_MS = 1800

export function normalizeExtensionSettings(
  candidate: Partial<ExtensionSettings> | null | undefined,
): ExtensionSettings {
  return {
    liveCaptureEnabled:
      candidate?.liveCaptureEnabled === undefined
        ? DEFAULT_EXTENSION_SETTINGS.liveCaptureEnabled
        : Boolean(candidate.liveCaptureEnabled),
    blockOnScanFailure:
      candidate?.blockOnScanFailure === undefined
        ? DEFAULT_EXTENSION_SETTINGS.blockOnScanFailure
        : Boolean(candidate.blockOnScanFailure),
    minimumAllowedScore: normalizeMinimumScore(candidate?.minimumAllowedScore),
    blockBelowMinimumScore:
      candidate?.blockBelowMinimumScore === undefined
        ? DEFAULT_EXTENSION_SETTINGS.blockBelowMinimumScore
        : Boolean(candidate.blockBelowMinimumScore),
    trustedHosts: normalizeHostList(candidate?.trustedHosts),
    scoreGateIgnoredHosts: normalizeHostList(candidate?.scoreGateIgnoredHosts),
  }
}

export function normalizeMinimumScore(value: unknown, fallback = 50) {
  const parsed = Number.parseInt(String(value ?? fallback), 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return Math.min(100, Math.max(0, parsed))
}

export function normalizeHostList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? '').trim().toLowerCase())
        .filter((item) => item.length > 0),
    ),
  ).slice(0, 50)
}

export async function getExtensionSettings() {
  const response = await sendExtensionBridgeMessage<{ settings?: Partial<ExtensionSettings> }>({
    type: 'vsw:get-extension-settings',
  })

  if (!response.ok) {
    throw new Error(response.error || 'Extension settings are not available.')
  }

  return normalizeExtensionSettings(response.settings)
}

export async function setExtensionSettings(settings: ExtensionSettings) {
  const response = await sendExtensionBridgeMessage<{ settings?: Partial<ExtensionSettings> }>({
    type: 'vsw:set-extension-settings',
    settings,
  })

  if (!response.ok) {
    throw new Error(response.error || 'Extension settings could not be saved.')
  }

  return normalizeExtensionSettings(response.settings)
}

function sendExtensionBridgeMessage<TResponse>(
  message: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string } & TResponse> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      reject(new Error('VSW Link Capture extension bridge is not available.'))
    }, REQUEST_TIMEOUT_MS)

    function handleMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.data?.source !== 'vsw-link-capture' ||
        event.data?.requestId !== requestId
      ) {
        return
      }

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleMessage)
      resolve(event.data.response)
    }

    window.addEventListener('message', handleMessage)
    window.postMessage(
      {
        source: 'vsw-app',
        requestId,
        ...message,
      },
      window.location.origin,
    )
  })
}

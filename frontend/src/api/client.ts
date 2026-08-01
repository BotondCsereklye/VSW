import type {
  DiscoveredLinksResponse,
  ScanDetail,
  ScanExportFormat,
  ScanSummary,
} from '../types/scan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const API_KEY = import.meta.env.VITE_VSW_API_KEY

function apiHeaders(extraHeaders?: HeadersInit): HeadersInit {
  return {
    ...(API_KEY ? { 'X-VSW-API-Key': API_KEY } : {}),
    ...(extraHeaders ?? {}),
  }
}

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(`Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...apiHeaders(init?.headers),
    },
    ...init,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await parseJsonSafe(response))
  }

  return response.json() as Promise<T>
}

async function parseJsonSafe(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function listScans() {
  return fetchJson<ScanSummary[]>('/scans')
}

export function createScan(target: string) {
  return fetchJson<ScanSummary>('/scans', {
    method: 'POST',
    body: JSON.stringify({ target }),
  })
}

export function getScanDetail(scanId: string) {
  return fetchJson<ScanDetail>(`/scans/${scanId}`)
}

export function getScanHistory(scanId: string) {
  return fetchJson<ScanSummary[]>(`/scans/${scanId}/history`)
}

export function discoverScanLinks(scanId: string, limit = 12) {
  return fetchJson<DiscoveredLinksResponse>(`/scans/${scanId}/links?limit=${limit}`)
}

export async function exportScan(scanId: string, format: ScanExportFormat) {
  const response = await fetch(`${API_BASE_URL}/scans/${scanId}/export?format=${format}`, {
    headers: apiHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('content-disposition')
  const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/)

  return {
    blob,
    filename: filenameMatch?.[1] ?? `scan-report.${format}`,
  }
}

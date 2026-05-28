import type { ScanDetail, ScanSummary } from '../types/scan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
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

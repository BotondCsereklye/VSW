export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed'

export type FindingSeverity = 'low' | 'medium' | 'high'
export type ScanExportFormat = 'json' | 'csv'
export type DiscoveredLinksResponse = {
  scan_id: string
  target: string
  links: string[]
}

export type ScanFinding = {
  id: string
  category: string
  severity: FindingSeverity
  title: string
  description: string
  recommendation: string
  evidence: Record<string, unknown>
  created_at: string
}

export type ScanSummary = {
  id: string
  target: string
  normalized_target: string
  target_type: 'domain' | 'ip'
  status: ScanStatus
  score: number | null
  summary: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ReportSnapshot = {
  id: string
  http_headers: Record<string, unknown>
  tls_analysis: Record<string, unknown>
  port_results: Array<Record<string, unknown>>
  misconfigurations: Array<Record<string, unknown>>
  metadata: Record<string, unknown>
  created_at: string
}

export type ScanDetail = ScanSummary & {
  findings: ScanFinding[]
  snapshot: ReportSnapshot | null
}

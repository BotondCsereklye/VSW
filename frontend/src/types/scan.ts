export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed'

export type FindingSeverity = 'low' | 'medium' | 'high'

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

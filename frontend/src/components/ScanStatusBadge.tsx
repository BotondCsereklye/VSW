import { ScanStatus } from '../types/scan'

type ScanStatusBadgeProps = {
  status: ScanStatus
}

export function ScanStatusBadge({ status }: ScanStatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{status}</span>
}

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import type { ScanSummary } from '../types/scan'
import { groupScansByScoreBand } from './ScanDashboard.logic'
import { ScanDashboard } from './ScanDashboard'

function scan(overrides: Partial<ScanSummary>): ScanSummary {
  return {
    id: 'scan-default',
    target: 'example.com',
    normalized_target: 'example.com',
    target_type: 'domain',
    status: 'completed',
    score: 82,
    summary: 'Mostly secure',
    started_at: null,
    completed_at: '2026-05-28T08:30:00Z',
    created_at: '2026-05-28T08:00:00Z',
    updated_at: '2026-05-28T08:30:00Z',
    ...overrides,
  }
}

test('ScanDashboard makes the full scan card clickable to open a report', async () => {
  const user = userEvent.setup()
  const onSelectScan = vi.fn()

  render(
    <ScanDashboard
      scans={[
        scan({
          id: 'scan-1',
          target: 'example.com',
        }),
      ]}
      selectedScanId={null}
      onSelectScan={onSelectScan}
    />,
  )

  expect(screen.getByRole('heading', { name: /example.com/i, level: 4 })).toBeInTheDocument()
  expect(screen.getByText(/mostly secure/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /open report for example.com/i }))

  expect(onSelectScan).toHaveBeenCalledWith('scan-1')
})


test('ScanDashboard renders an empty state when no scans exist', () => {
  render(<ScanDashboard scans={[]} selectedScanId={null} onSelectScan={vi.fn()} />)

  expect(screen.getByText(/no scans yet/i)).toBeInTheDocument()
})


test('groupScansByScoreBand groups scans into score classes and keeps pending scans visible', () => {
  const groups = groupScansByScoreBand([
    scan({ id: 'pending', status: 'running', score: null }),
    scan({ id: 'good', score: 76 }),
    scan({ id: 'watch', score: 50 }),
    scan({ id: 'weak', score: 25 }),
    scan({ id: 'critical', score: 0 }),
  ])

  expect(groups.map((group) => group.label)).toEqual(['Pending', '75+', '50+', '25+', '0+'])
  expect(groups.map((group) => group.scans[0].id)).toEqual([
    'pending',
    'good',
    'watch',
    'weak',
    'critical',
  ])
})


test('ScanDashboard renders score classification sections', () => {
  render(
    <ScanDashboard
      scans={[
        scan({ id: 'scan-good', target: 'good.example', score: 92 }),
        scan({ id: 'scan-watch', target: 'watch.example', score: 63 }),
        scan({ id: 'scan-critical', target: 'critical.example', score: 12 }),
        scan({ id: 'scan-pending', target: 'pending.example', status: 'pending', score: null }),
      ]}
      selectedScanId="scan-critical"
      onSelectScan={vi.fn()}
    />,
  )

  expect(screen.getByRole('heading', { name: 'Pending' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '75+' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '50+' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '0+' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /open report for critical.example/i })).toHaveClass(
    'scan-row--active',
  )
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { ScanDashboard } from './ScanDashboard'


test('ScanDashboard renders scan rows and notifies when a report is selected', async () => {
  const user = userEvent.setup()
  const onSelectScan = vi.fn()

  render(
    <ScanDashboard
      scans={[
        {
          id: 'scan-1',
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
        },
      ]}
      selectedScanId={null}
      onSelectScan={onSelectScan}
    />,
  )

  expect(screen.getByRole('heading', { name: /example.com/i })).toBeInTheDocument()
  expect(screen.getByText(/mostly secure/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /open report for example.com/i }))

  expect(onSelectScan).toHaveBeenCalledWith('scan-1')
})


test('ScanDashboard renders an empty state when no scans exist', () => {
  render(<ScanDashboard scans={[]} selectedScanId={null} onSelectScan={vi.fn()} />)

  expect(screen.getByText(/no scans yet/i)).toBeInTheDocument()
})

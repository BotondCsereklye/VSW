import { render, screen } from '@testing-library/react'

import { ScanStatusBadge } from './ScanStatusBadge'


test('ScanStatusBadge renders the current scan state', () => {
  render(<ScanStatusBadge status="running" />)

  const badge = screen.getByText(/running/i)
  expect(badge).toHaveClass('status-badge', 'status-running')
})

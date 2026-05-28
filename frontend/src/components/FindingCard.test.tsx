import { render, screen } from '@testing-library/react'

import { FindingCard } from './FindingCard'


test('FindingCard renders severity, explanation, evidence and recommendation', () => {
  render(
    <FindingCard
      finding={{
        id: 'finding-1',
        category: 'transport',
        severity: 'high',
        title: 'HTTPS is not reachable',
        description: 'The target does not expose a secure transport endpoint.',
        recommendation: 'Enable HTTPS on port 443.',
        evidence: { port: 443 },
        created_at: '2026-05-28T08:00:00Z',
      }}
    />,
  )

  expect(screen.getByText(/https is not reachable/i)).toBeInTheDocument()
  expect(screen.getByText(/high/i)).toHaveClass('finding-card__severity', 'severity-high')
  expect(screen.getByText(/enable https on port 443/i)).toBeInTheDocument()
  expect(screen.getByText(/"port": 443/i)).toBeInTheDocument()
})

import { render, screen } from '@testing-library/react'

import { ReportDetail } from './ReportDetail'


test('ReportDetail renders score, snapshot highlights and findings', () => {
  render(
    <ReportDetail
      scan={{
        id: 'scan-1',
        target: 'example.com',
        normalized_target: 'example.com',
        target_type: 'domain',
        status: 'completed',
        score: 63,
        summary: 'Needs transport hardening',
        started_at: '2026-05-28T08:00:00Z',
        completed_at: '2026-05-28T08:05:00Z',
        created_at: '2026-05-28T08:00:00Z',
        updated_at: '2026-05-28T08:05:00Z',
        findings: [
          {
            id: 'finding-1',
            category: 'transport',
            severity: 'high',
            title: 'TLS certificate is expired',
            description: 'The certificate is past its validity period.',
            recommendation: 'Renew the certificate.',
            evidence: { issuer: 'Legacy CA' },
            created_at: '2026-05-28T08:05:00Z',
          },
        ],
        snapshot: {
          id: 'snapshot-1',
          http_headers: { 'x-frame-options': 'DENY' },
          tls_analysis: { https_reachable: true, issuer: 'Legacy CA' },
          port_results: [{ port: 443, state: 'open' }],
          misconfigurations: [{ title: 'TLS certificate is expired' }],
          metadata: { target: 'example.com' },
          created_at: '2026-05-28T08:05:00Z',
        },
      }}
    />,
  )

  expect(screen.getByRole('heading', { name: /example.com/i })).toBeInTheDocument()
  expect(screen.getByText(/63\/100/i)).toBeInTheDocument()
  expect(screen.getAllByText(/legacy ca/i)).toHaveLength(2)
  expect(screen.getByText(/tls certificate is expired/i)).toBeInTheDocument()
})


test('ReportDetail renders an empty placeholder without a selected scan', () => {
  render(<ReportDetail scan={null} />)

  expect(screen.getByText(/select a scan to inspect its findings/i)).toBeInTheDocument()
})

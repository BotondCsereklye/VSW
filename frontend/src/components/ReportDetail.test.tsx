import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { ReportDetail } from './ReportDetail'

function createScanDetail(findingCount = 1) {
  const findings = Array.from({ length: findingCount }, (_, index) => ({
    id: `finding-${index + 1}`,
    category: 'transport',
    severity: 'high' as const,
    title: index === 0 ? 'TLS certificate is expired' : `Additional finding ${index + 1}`,
    description: 'The certificate is past its validity period.',
    recommendation: 'Renew the certificate.',
    evidence: { issuer: 'Legacy CA' },
    created_at: '2026-05-28T08:05:00Z',
  }))

  return {
    id: 'scan-1',
    target: 'example.com',
    normalized_target: 'example.com',
    target_type: 'domain' as const,
    status: 'completed' as const,
    score: 63,
    summary: 'Needs transport hardening',
    started_at: '2026-05-28T08:00:00Z',
    completed_at: '2026-05-28T08:05:00Z',
    created_at: '2026-05-28T08:00:00Z',
    updated_at: '2026-05-28T08:05:00Z',
    findings,
    snapshot: {
      id: 'snapshot-1',
      http_headers: { 'x-frame-options': 'DENY' },
      tls_analysis: { https_reachable: true, issuer: 'Legacy CA' },
      port_results: [{ port: 443, state: 'open' }],
      misconfigurations: [{ title: 'TLS certificate is expired' }],
      metadata: { target: 'example.com' },
      created_at: '2026-05-28T08:05:00Z',
    },
  }
}

function createHistory() {
  return [
    {
      id: 'scan-1',
      target: 'example.com',
      normalized_target: 'example.com',
      target_type: 'domain' as const,
      status: 'completed' as const,
      score: 63,
      summary: 'Needs transport hardening',
      started_at: '2026-05-28T08:00:00Z',
      completed_at: '2026-05-28T08:05:00Z',
      created_at: '2026-05-28T08:00:00Z',
      updated_at: '2026-05-28T08:05:00Z',
    },
    {
      id: 'scan-0',
      target: 'example.com',
      normalized_target: 'example.com',
      target_type: 'domain' as const,
      status: 'completed' as const,
      score: 79,
      summary: 'Stronger baseline',
      started_at: '2026-05-20T08:00:00Z',
      completed_at: '2026-05-20T08:05:00Z',
      created_at: '2026-05-20T08:00:00Z',
      updated_at: '2026-05-20T08:05:00Z',
    },
  ]
}


test('ReportDetail renders score, findings and snapshot action buttons', () => {
  render(
    <ReportDetail
      scan={createScanDetail()}
      history={createHistory()}
    />,
  )

  expect(screen.getByRole('heading', { name: /example.com/i })).toBeInTheDocument()
  expect(screen.getByText(/63\/100/i)).toBeInTheDocument()
  expect(screen.getByText(/tls certificate is expired/i)).toBeInTheDocument()
  expect(screen.getByText(/trend degraded/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /view tls/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /view headers/i })).toBeInTheDocument()
})


test('ReportDetail renders an empty placeholder without a selected scan', () => {
  render(<ReportDetail scan={null} />)

  expect(screen.getByText(/select a scan to inspect its findings/i)).toBeInTheDocument()
})


test('ReportDetail calls export handlers for available formats', async () => {
  const user = userEvent.setup()
  const onExport = vi.fn()

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
        findings: [],
        snapshot: null,
      }}
      history={[]}
      onExport={onExport}
    />,
  )

  await user.click(screen.getByRole('button', { name: /export json/i }))
  await user.click(screen.getByRole('button', { name: /export csv/i }))

  expect(onExport).toHaveBeenNthCalledWith(1, 'json')
  expect(onExport).toHaveBeenNthCalledWith(2, 'csv')
})


test('ReportDetail opens TLS details and closes modal with Escape', async () => {
  const user = userEvent.setup()

  render(<ReportDetail scan={createScanDetail()} history={createHistory()} />)

  await user.click(screen.getByRole('button', { name: /view tls/i }))
  const dialog = screen.getByRole('dialog', { name: /tls details/i })
  expect(dialog).toBeInTheDocument()
  expect(dialog).toHaveTextContent(/legacy ca/i)

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: /tls details/i })).not.toBeInTheDocument()
})


test('ReportDetail closes modal when clicking on the backdrop', async () => {
  const user = userEvent.setup()

  render(<ReportDetail scan={createScanDetail()} history={createHistory()} />)

  await user.click(screen.getByRole('button', { name: /view headers/i }))
  const dialog = screen.getByRole('dialog', { name: /header details/i })
  const backdrop = dialog.parentElement
  if (backdrop === null) {
    throw new Error('Expected modal backdrop to exist.')
  }

  await user.click(backdrop)
  expect(screen.queryByRole('dialog', { name: /header details/i })).not.toBeInTheDocument()
})


test('ReportDetail closes modal via close button', async () => {
  const user = userEvent.setup()

  render(<ReportDetail scan={createScanDetail()} history={createHistory()} />)

  await user.click(screen.getByRole('button', { name: /view tls/i }))
  expect(screen.getByRole('dialog', { name: /tls details/i })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /close details/i }))
  expect(screen.queryByRole('dialog', { name: /tls details/i })).not.toBeInTheDocument()
})


test('ReportDetail collapses long finding lists and can expand on demand', async () => {
  const user = userEvent.setup()
  render(<ReportDetail scan={createScanDetail(6)} history={createHistory()} />)

  expect(screen.getByText(/additional finding 2/i)).toBeInTheDocument()
  expect(screen.getByText(/additional finding 3/i)).toBeInTheDocument()
  expect(screen.queryByText(/additional finding 4/i)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /show more \(3\)/i })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /show more \(3\)/i }))
  expect(screen.getByText(/additional finding 6/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
})


test('ReportDetail shows discovered links and triggers link checks', async () => {
  const user = userEvent.setup()
  const onInspectLink = vi.fn()
  render(
    <ReportDetail
      scan={createScanDetail()}
      history={createHistory()}
      discoveredLinks={[
        'https://example.com/',
        'https://example.com/security',
      ]}
      checkedLinks={['https://example.com/']}
      onInspectLink={onInspectLink}
    />,
  )

  expect(screen.getByRole('heading', { name: /guided link checks/i })).toBeInTheDocument()
  expect(screen.getByText(/checked/i)).toBeInTheDocument()

  await user.click(screen.getAllByRole('button', { name: /check link host/i })[1])
  expect(onInspectLink).toHaveBeenCalledWith('https://example.com/security')
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, vi } from 'vitest'

import { AppShell } from './AppShell'


function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  })
}

describe('AppShell', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    vi.useRealTimers()
  })

  test('loads scans, navigates to a report and renders its detail state', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        jsonResponse([
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
        ]),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
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
          findings: [],
          snapshot: {
            id: 'snapshot-1',
            http_headers: {},
            tls_analysis: { issuer: 'Example CA' },
            port_results: [],
            misconfigurations: [],
            metadata: { target: 'example.com' },
            created_at: '2026-05-28T08:30:00Z',
          },
        }),
      )
      .mockImplementationOnce(() =>
        jsonResponse([
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
        ]),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          scan_id: 'scan-1',
          target: 'example.com',
          links: ['https://example.com/', 'https://example.com/security'],
        }),
      )

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /example.com/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open report for example.com/i }))

    expect(await screen.findByRole('button', { name: /view tls/i })).toBeInTheDocument()
  })

  test('creates a scan and refreshes the dashboard', async () => {
    const pendingSummary = {
      id: 'scan-2',
      target: 'demo.example',
      normalized_target: 'demo.example',
      target_type: 'domain' as const,
      status: 'pending' as const,
      score: null,
      summary: null,
      started_at: null,
      completed_at: null,
      created_at: '2026-05-28T08:35:00Z',
      updated_at: '2026-05-28T08:35:00Z',
    }
    const pendingDetail = {
      ...pendingSummary,
      findings: [],
      snapshot: null,
    }
    const completedSummary = {
      ...pendingSummary,
      status: 'completed' as const,
      score: 82,
      summary: 'Mostly secure',
      completed_at: '2026-05-28T08:36:00Z',
      updated_at: '2026-05-28T08:36:00Z',
    }
    const completedDetail = {
      ...completedSummary,
      findings: [],
      snapshot: {
        id: 'snapshot-2',
        http_headers: {},
        tls_analysis: { issuer: 'Example CA' },
        port_results: [],
        misconfigurations: [],
        metadata: { target: 'demo.example' },
        created_at: '2026-05-28T08:36:00Z',
      },
    }

    let listCallCount = 0
    let detailCallCount = 0
    let historyCallCount = 0
    let linksCallCount = 0

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url.endsWith('/scans') && init?.method === 'POST') {
        return jsonResponse(pendingSummary, 202)
      }

      if (url.endsWith('/scans/scan-2/history')) {
        historyCallCount += 1
        return jsonResponse([historyCallCount >= 2 ? completedSummary : pendingSummary])
      }

      if (url.endsWith('/scans/scan-2/links?limit=12')) {
        linksCallCount += 1
        return jsonResponse({
          scan_id: 'scan-2',
          target: 'demo.example',
          links:
            linksCallCount >= 2
              ? ['https://demo.example/', 'https://demo.example/security']
              : ['https://demo.example/'],
        })
      }

      if (url.endsWith('/scans/scan-2')) {
        detailCallCount += 1
        return jsonResponse(detailCallCount >= 2 ? completedDetail : pendingDetail)
      }

      if (url.endsWith('/scans')) {
        listCallCount += 1
        if (listCallCount === 1) {
          return jsonResponse([])
        }

        return jsonResponse([listCallCount >= 3 ? completedSummary : pendingSummary])
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/target/i), 'demo.example')
    await user.click(screen.getByRole('button', { name: /start safe scan/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/scans'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ target: 'demo.example' }),
        }),
      )
    })

    expect(await screen.findByText(/waiting for scan results/i)).toBeInTheDocument()
    await waitFor(
      () => {
        expect(screen.getAllByText(/mostly secure/i).length).toBeGreaterThan(0)
      },
      { timeout: 4000 },
    )

    expect(await screen.findByRole('button', { name: /view tls/i })).toBeInTheDocument()
  }, 8000)

  test('shows an error message when the scan list cannot be loaded', async () => {
    fetchMock.mockImplementationOnce(() => jsonResponse({ detail: 'Boom' }, 500))

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    )

    expect((await screen.findAllByText(/backend is offline/i)).length).toBeGreaterThan(0)
  })

  test('shows offline state and reconnects when the backend returns', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('Backend offline'))
      .mockImplementationOnce(() =>
        jsonResponse([
          {
            id: 'scan-online',
            target: 'example.com',
            normalized_target: 'example.com',
            target_type: 'domain',
            status: 'completed',
            score: 88,
            summary: 'Recovered backend',
            started_at: null,
            completed_at: '2026-05-28T08:30:00Z',
            created_at: '2026-05-28T08:00:00Z',
            updated_at: '2026-05-28T08:30:00Z',
          },
        ]),
      )

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>,
    )

    expect((await screen.findAllByText(/backend is offline/i)).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /reconnect/i }))

    expect(await screen.findByText(/backend online/i)).toBeInTheDocument()
    expect(await screen.findByText(/recovered backend/i)).toBeInTheDocument()
  })
})

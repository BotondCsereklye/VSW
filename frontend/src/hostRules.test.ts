import { expect, test } from 'vitest'

import { buildHostSummaries, toggleHost } from './hostRules'
import type { ScanSummary } from './types/scan'

test('buildHostSummaries groups scans by host and keeps the latest score', () => {
  const summaries = buildHostSummaries([
    scan({
      id: 'old-youtube',
      normalized_target: 'youtube.com',
      score: 60,
      updated_at: '2026-06-01T10:00:00Z',
    }),
    scan({
      id: 'new-youtube',
      normalized_target: 'youtube.com',
      score: 84,
      updated_at: '2026-06-02T10:00:00Z',
    }),
    scan({
      id: 'github',
      normalized_target: 'github.com',
      score: 91,
      updated_at: '2026-06-03T10:00:00Z',
    }),
  ])

  expect(summaries).toEqual([
    {
      host: 'youtube.com',
      scanCount: 2,
      latestScore: 84,
      latestUpdatedAt: '2026-06-02T10:00:00Z',
    },
    {
      host: 'github.com',
      scanCount: 1,
      latestScore: 91,
      latestUpdatedAt: '2026-06-03T10:00:00Z',
    },
  ])
})

test('toggleHost adds and removes normalized host names', () => {
  expect(toggleHost([], ' GitHub.com ')).toEqual(['github.com'])
  expect(toggleHost(['github.com'], 'github.com')).toEqual([])
})

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

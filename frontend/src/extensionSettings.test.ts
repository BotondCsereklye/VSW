import { describe, expect, test } from 'vitest'

import { normalizeExtensionSettings, normalizeMinimumScore } from './extensionSettings'

describe('extension settings helpers', () => {
  test('normalizes missing settings to safe defaults', () => {
    expect(normalizeExtensionSettings(null)).toEqual({
      liveCaptureEnabled: true,
      blockOnScanFailure: true,
      minimumAllowedScore: 50,
      blockBelowMinimumScore: true,
      trustedHosts: [],
      scoreGateIgnoredHosts: [],
    })
  })

  test('normalizes host rule lists', () => {
    expect(
      normalizeExtensionSettings({
        trustedHosts: [' GitHub.com ', 'github.com', ''],
        scoreGateIgnoredHosts: ['YouTube.com'],
      }),
    ).toMatchObject({
      trustedHosts: ['github.com'],
      scoreGateIgnoredHosts: ['youtube.com'],
    })
  })

  test('clamps minimum score to the supported range', () => {
    expect(normalizeMinimumScore(-10)).toBe(0)
    expect(normalizeMinimumScore(120)).toBe(100)
    expect(normalizeMinimumScore('67')).toBe(67)
    expect(normalizeMinimumScore('invalid')).toBe(50)
  })
})

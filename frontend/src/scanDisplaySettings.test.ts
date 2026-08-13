import { describe, expect, test } from 'vitest'

import {
  loadRecentScanSeenAt,
  normalizeRecentScanMinutes,
  saveRecentScanSeenAt,
} from './scanDisplaySettings'

describe('scan display settings', () => {
  test('clamps recent scan duration to the supported 1 to 30 minute range', () => {
    expect(normalizeRecentScanMinutes(1)).toBe(1)
    expect(normalizeRecentScanMinutes(5)).toBe(5)
    expect(normalizeRecentScanMinutes(20)).toBe(20)
    expect(normalizeRecentScanMinutes(90)).toBe(30)
    expect(normalizeRecentScanMinutes(Number.NaN)).toBe(20)
  })

  test('persists local seen timestamps for recent scans', () => {
    saveRecentScanSeenAt({
      fresh: 1_780_000_000_000,
      invalid: Number.NaN,
    })

    expect(loadRecentScanSeenAt()).toEqual({
      fresh: 1_780_000_000_000,
    })
  })
})

import { describe, expect, test } from 'vitest'

import { normalizeRecentScanMinutes } from './scanDisplaySettings'

describe('scan display settings', () => {
  test('clamps recent scan duration to the supported 10 to 30 minute range', () => {
    expect(normalizeRecentScanMinutes(1)).toBe(10)
    expect(normalizeRecentScanMinutes(20)).toBe(20)
    expect(normalizeRecentScanMinutes(90)).toBe(30)
    expect(normalizeRecentScanMinutes(Number.NaN)).toBe(20)
  })
})

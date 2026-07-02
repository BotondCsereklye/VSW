import { beforeEach, expect, test } from 'vitest'

import {
  addSafetyMessage,
  getSafetyMessageRetentionMinutes,
  loadSafetyMessages,
  pruneSafetyMessages,
  setSafetyMessageRetentionMinutes,
  type SafetyMessage,
} from './safetyMessages'

const NOW = 1_000_000

beforeEach(() => {
  window.localStorage.clear()
})

test('pruneSafetyMessages removes messages outside the retention window', () => {
  const messages = [
    buildMessage('fresh', NOW - 60_000),
    buildMessage('expired', NOW - 360_000),
  ]

  expect(pruneSafetyMessages(messages, 5, NOW)).toEqual([messages[0]])
})

test('setSafetyMessageRetentionMinutes clamps invalid values', () => {
  expect(setSafetyMessageRetentionMinutes(0)).toBe(1)
  expect(getSafetyMessageRetentionMinutes()).toBe(1)

  expect(setSafetyMessageRetentionMinutes(90)).toBe(60)
  expect(getSafetyMessageRetentionMinutes()).toBe(60)
})

test('addSafetyMessage keeps newest messages first and deduplicates by id', () => {
  const first = buildMessage('blocked-github', NOW)
  const updated = { ...first, message: 'Updated message' }

  addSafetyMessage(first, NOW)
  addSafetyMessage(updated, NOW + 1000)

  expect(loadSafetyMessages(NOW + 1000)).toEqual([updated])
})

function buildMessage(id: string, createdAt: number): SafetyMessage {
  return {
    id,
    type: 'blocked',
    target: 'example.com',
    message: 'Website blocked by VSW.',
    score: 42,
    minimumAllowedScore: 50,
    createdAt,
  }
}

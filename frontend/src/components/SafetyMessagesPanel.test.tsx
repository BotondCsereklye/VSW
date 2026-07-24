import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { SafetyMessagesPanel } from './SafetyMessagesPanel'

test('SafetyMessagesPanel renders blocked visit details and retention control', () => {
  const handleRetentionChange = vi.fn()

  render(
    <SafetyMessagesPanel
      retentionMinutes={5}
      onRetentionChange={handleRetentionChange}
      messages={[
        {
          id: 'blocked-1',
          type: 'blocked',
          target: 'schulnetz.example',
          message: 'Blocked by score gate.',
          score: 83,
          minimumAllowedScore: 85,
          createdAt: Date.now(),
        },
      ]}
    />,
  )

  expect(screen.getByText('Website not safe: schulnetz.example')).toBeInTheDocument()
  expect(screen.getByText('Score 83/100 below minimum 85/100.')).toBeInTheDocument()

  const retentionInput = screen.getByLabelText(/Show latest for/i)
  fireEvent.change(retentionInput, { target: { value: '10' } })
  fireEvent.blur(retentionInput)

  expect(handleRetentionChange).toHaveBeenLastCalledWith(10)
})

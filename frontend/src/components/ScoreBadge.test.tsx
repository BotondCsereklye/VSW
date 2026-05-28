import { render, screen } from '@testing-library/react'

import { ScoreBadge } from './ScoreBadge'


test('ScoreBadge renders a numeric score with qualitative styling', () => {
  render(<ScoreBadge score={82} />)

  const badge = screen.getByText(/82\/100/i)
  expect(badge).toHaveClass('score-badge', 'score-good')
})


test('ScoreBadge shows a pending state when no score is available', () => {
  render(<ScoreBadge score={null} />)

  expect(screen.getByText(/pending/i)).toBeInTheDocument()
})

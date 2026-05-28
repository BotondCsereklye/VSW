type ScoreBadgeProps = {
  score: number | null
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) {
    return <span className="score-badge score-pending">Pending</span>
  }

  const scoreClass = score >= 80 ? 'score-good' : score >= 50 ? 'score-watch' : 'score-critical'

  return <span className={`score-badge ${scoreClass}`}>{score}/100</span>
}

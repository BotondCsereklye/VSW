import { ScanFinding } from '../types/scan'

type FindingCardProps = {
  finding: ScanFinding
}

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <article className="finding-card">
      <header className="finding-card__header">
        <p className={`finding-card__severity severity-${finding.severity}`}>{finding.severity}</p>
        <h3>{finding.title}</h3>
      </header>
      <p>{finding.description}</p>
      <div className="finding-card__section">
        <strong>Recommendation</strong>
        <p>{finding.recommendation}</p>
      </div>
      <div className="finding-card__section">
        <strong>Evidence</strong>
        <pre>{JSON.stringify(finding.evidence, null, 2)}</pre>
      </div>
    </article>
  )
}

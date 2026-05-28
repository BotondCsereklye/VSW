from app.services.misconfigurations import FindingDraft, FindingSeverity

SEVERITY_PENALTIES = {
    FindingSeverity.HIGH: 25,
    FindingSeverity.MEDIUM: 12,
    FindingSeverity.LOW: 5,
}


def calculate_score(findings: list[FindingDraft]) -> int:
    score = 100
    for finding in findings:
        score -= SEVERITY_PENALTIES[finding.severity]
    return max(0, score)

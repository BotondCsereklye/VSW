from app.services.misconfigurations import FindingCategory, FindingDraft, FindingSeverity
from app.services.scoring import calculate_score


def test_calculate_score_applies_weighted_penalties() -> None:
    findings = [
        FindingDraft(
            category=FindingCategory.TRANSPORT,
            severity=FindingSeverity.HIGH,
            title="HTTPS is not reachable",
            description="desc",
            recommendation="fix",
        ),
        FindingDraft(
            category=FindingCategory.HEADERS,
            severity=FindingSeverity.MEDIUM,
            title="Missing header: content-security-policy",
            description="desc",
            recommendation="fix",
        ),
        FindingDraft(
            category=FindingCategory.HEADERS,
            severity=FindingSeverity.LOW,
            title="Missing header: x-frame-options",
            description="desc",
            recommendation="fix",
        ),
    ]

    assert calculate_score(findings) == 58


def test_calculate_score_never_drops_below_zero() -> None:
    findings = [
        FindingDraft(
            category=FindingCategory.NETWORK,
            severity=FindingSeverity.HIGH,
            title=f"High finding {index}",
            description="desc",
            recommendation="fix",
        )
        for index in range(10)
    ]

    assert calculate_score(findings) == 0

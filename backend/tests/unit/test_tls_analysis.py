from datetime import UTC, datetime, timedelta

from app.services.tls import CertificateDetails, analyze_tls_posture


def test_analyze_tls_posture_marks_valid_certificate_and_versions() -> None:
    certificate = CertificateDetails(
        issuer="Example CA",
        not_after=datetime.now(UTC) + timedelta(days=90),
    )

    analysis = analyze_tls_posture(
        https_reachable=True,
        certificate=certificate,
        supported_versions=["TLSv1.2", "TLSv1.3"],
    )

    assert analysis.https_reachable is True
    assert analysis.certificate_valid is True
    assert analysis.certificate_expired is False
    assert analysis.issuer == "Example CA"
    assert analysis.supported_versions == ["TLSv1.2", "TLSv1.3"]


def test_analyze_tls_posture_marks_expired_certificate() -> None:
    certificate = CertificateDetails(
        issuer="Legacy CA",
        not_after=datetime.now(UTC) - timedelta(days=1),
    )

    analysis = analyze_tls_posture(
        https_reachable=True,
        certificate=certificate,
        supported_versions=["TLSv1.2"],
    )

    assert analysis.certificate_valid is False
    assert analysis.certificate_expired is True


def test_analyze_tls_posture_handles_unreachable_https() -> None:
    analysis = analyze_tls_posture(
        https_reachable=False,
        certificate=None,
        supported_versions=[],
    )

    assert analysis.https_reachable is False
    assert analysis.certificate_valid is False
    assert analysis.issuer is None
    assert analysis.expires_at is None

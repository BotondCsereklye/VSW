from datetime import UTC, datetime, timedelta

from app.services.tls import CertificateDetails, probe_tls_target


def test_probe_tls_target_builds_analysis_from_loader_and_version_probe() -> None:
    def certificate_loader(target: str):
        return True, CertificateDetails(
            issuer="Example CA",
            not_after=datetime.now(UTC) + timedelta(days=14),
        )

    def version_probe(target: str):
        return ["TLSv1.2", "TLSv1.3"]

    analysis = probe_tls_target(
        "example.com",
        certificate_loader=certificate_loader,
        version_probe=version_probe,
    )

    assert analysis.https_reachable is True
    assert analysis.certificate_valid is True
    assert analysis.supported_versions == ["TLSv1.2", "TLSv1.3"]


def test_probe_tls_target_handles_unreachable_targets() -> None:
    def certificate_loader(target: str):
        return False, None

    analysis = probe_tls_target("example.com", certificate_loader=certificate_loader)

    assert analysis.https_reachable is False
    assert analysis.certificate_valid is False
    assert analysis.supported_versions == []

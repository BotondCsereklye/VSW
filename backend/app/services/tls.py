from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass(frozen=True, slots=True)
class CertificateDetails:
    issuer: str
    not_after: datetime


@dataclass(frozen=True, slots=True)
class TlsAnalysis:
    https_reachable: bool
    certificate_valid: bool
    certificate_expired: bool
    issuer: str | None
    expires_at: datetime | None
    supported_versions: list[str]


def analyze_tls_posture(
    *,
    https_reachable: bool,
    certificate: CertificateDetails | None,
    supported_versions: list[str],
) -> TlsAnalysis:
    now = datetime.now(UTC)
    expires_at = certificate.not_after if certificate else None
    certificate_expired = expires_at is not None and expires_at < now
    certificate_valid = https_reachable and certificate is not None and not certificate_expired

    return TlsAnalysis(
        https_reachable=https_reachable,
        certificate_valid=certificate_valid,
        certificate_expired=certificate_expired,
        issuer=certificate.issuer if certificate else None,
        expires_at=expires_at,
        supported_versions=supported_versions,
    )

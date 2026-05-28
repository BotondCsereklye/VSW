from __future__ import annotations

import socket
import ssl
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

type CertificateLoader = Callable[[str], tuple[bool, "CertificateDetails | None"]]
type VersionProbe = Callable[[str], list[str]]


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


def probe_tls_target(
    target: str,
    *,
    certificate_loader: CertificateLoader | None = None,
    version_probe: VersionProbe | None = None,
) -> TlsAnalysis:
    certificate_loader = certificate_loader or _load_certificate_details
    version_probe = version_probe or _probe_supported_tls_versions

    https_reachable, certificate = certificate_loader(target)
    supported_versions = version_probe(target) if https_reachable else []
    return analyze_tls_posture(
        https_reachable=https_reachable,
        certificate=certificate,
        supported_versions=supported_versions,
    )


def _load_certificate_details(target: str) -> tuple[bool, CertificateDetails | None]:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    try:
        with socket.create_connection((target, 443), timeout=3.0) as tcp_socket:
            with context.wrap_socket(tcp_socket, server_hostname=target) as tls_socket:
                certificate = tls_socket.getpeercert()
    except (OSError, ssl.SSLError):
        return False, None

    not_after_raw = certificate.get("notAfter")
    issuer = _format_issuer(certificate.get("issuer", ()))

    if not_after_raw is None:
        return True, None

    not_after = datetime.strptime(not_after_raw, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=UTC)
    return True, CertificateDetails(issuer=issuer, not_after=not_after)


def _probe_supported_tls_versions(target: str) -> list[str]:
    supported_versions: list[str] = []
    candidate_versions = {
        "TLSv1.2": ssl.TLSVersion.TLSv1_2,
        "TLSv1.3": ssl.TLSVersion.TLSv1_3,
    }

    for label, version in candidate_versions.items():
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.minimum_version = version
        context.maximum_version = version
        try:
            with socket.create_connection((target, 443), timeout=3.0) as tcp_socket:
                with context.wrap_socket(tcp_socket, server_hostname=target):
                    supported_versions.append(label)
        except (OSError, ssl.SSLError, ValueError):
            continue

    return supported_versions


def _format_issuer(raw_issuer: tuple[tuple[tuple[str, str], ...], ...]) -> str:
    parts: list[str] = []
    for attributes in raw_issuer:
        for name, value in attributes:
            parts.append(f"{name}={value}")
    return ", ".join(parts)

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class RequiredHeader(StrEnum):
    STRICT_TRANSPORT_SECURITY = "strict-transport-security"
    CONTENT_SECURITY_POLICY = "content-security-policy"
    X_FRAME_OPTIONS = "x-frame-options"
    X_CONTENT_TYPE_OPTIONS = "x-content-type-options"
    REFERRER_POLICY = "referrer-policy"
    PERMISSIONS_POLICY = "permissions-policy"


@dataclass(frozen=True, slots=True)
class HeaderCheck:
    name: RequiredHeader
    present: bool
    value: str | None


@dataclass(frozen=True, slots=True)
class HeaderAnalysis:
    checks: list[HeaderCheck]
    missing_headers: list[RequiredHeader]
    all_present: bool


def analyze_security_headers(headers: dict[str, str]) -> HeaderAnalysis:
    normalized_headers = {name.lower(): value for name, value in headers.items()}
    checks: list[HeaderCheck] = []
    missing_headers: list[RequiredHeader] = []

    for header_name in RequiredHeader:
        value = normalized_headers.get(header_name.value)
        present = value is not None and value.strip() != ""
        checks.append(
            HeaderCheck(name=header_name, present=present, value=value if present else None)
        )
        if not present:
            missing_headers.append(header_name)

    return HeaderAnalysis(
        checks=checks,
        missing_headers=missing_headers,
        all_present=not missing_headers,
    )

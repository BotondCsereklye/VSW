from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass
from enum import StrEnum


DOMAIN_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


class InvalidTargetError(ValueError):
    """Raised when a target cannot be normalized into a supported host value."""


class TargetType(StrEnum):
    DOMAIN = "domain"
    IP = "ip"


@dataclass(frozen=True, slots=True)
class NormalizedTarget:
    value: str
    target_type: TargetType


def validate_target(raw_target: str) -> NormalizedTarget:
    candidate = raw_target.strip().lower()

    if not candidate:
        raise InvalidTargetError("Target must not be empty.")

    if "://" in candidate or " " in candidate:
        raise InvalidTargetError("Only raw domains or IP addresses are allowed.")

    try:
        ipaddress.ip_address(candidate)
    except ValueError:
        return NormalizedTarget(value=_validate_domain(candidate), target_type=TargetType.DOMAIN)

    return NormalizedTarget(value=candidate, target_type=TargetType.IP)


def _validate_domain(candidate: str) -> str:
    if len(candidate) > 253 or "." not in candidate:
        raise InvalidTargetError("Only public-looking hostnames are supported.")

    labels = candidate.split(".")

    if any(not label or not DOMAIN_LABEL_PATTERN.match(label) for label in labels):
        raise InvalidTargetError("Domain labels contain unsupported characters.")

    if labels[-1].isdigit():
        raise InvalidTargetError("Top-level domain must contain letters.")

    return candidate

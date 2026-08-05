from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from enum import StrEnum

DOMAIN_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


class InvalidTargetError(ValueError):
    """Raised when a target cannot be normalized into a supported host value."""


class UnsafeTargetError(ValueError):
    """Raised when a target resolves to an address the scanner must not touch."""


class TargetType(StrEnum):
    DOMAIN = "domain"
    IP = "ip"


@dataclass(frozen=True, slots=True)
class NormalizedTarget:
    value: str
    target_type: TargetType


@dataclass(frozen=True, slots=True)
class ResolvedTarget:
    host: str
    address: str

    @property
    def url_host(self) -> str:
        parsed_address = ipaddress.ip_address(self.address)
        if parsed_address.version == 6:
            return f"[{self.address}]"
        return self.address

    @property
    def host_header(self) -> str:
        try:
            parsed_host = ipaddress.ip_address(self.host)
        except ValueError:
            return self.host
        if parsed_host.version == 6:
            return f"[{self.host}]"
        return self.host


def validate_target(raw_target: str) -> NormalizedTarget:
    candidate = raw_target.strip().lower()

    if not candidate:
        raise InvalidTargetError("Target must not be empty.")

    if "://" in candidate or " " in candidate:
        raise InvalidTargetError("Only raw domains or IP addresses are allowed.")

    try:
        address = ipaddress.ip_address(candidate)
    except ValueError:
        return NormalizedTarget(value=_validate_domain(candidate), target_type=TargetType.DOMAIN)

    if not is_public_ip(address):
        raise InvalidTargetError("Only public IP addresses are supported.")

    return NormalizedTarget(value=candidate, target_type=TargetType.IP)


def is_public_ip(address: ipaddress._BaseAddress) -> bool:
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


def ensure_public_target(target: str) -> None:
    resolve_public_target(target)


def resolve_public_target(target: str) -> ResolvedTarget:
    normalized = validate_target(target)
    if normalized.target_type is TargetType.IP:
        return ResolvedTarget(host=normalized.value, address=normalized.value)

    try:
        address_infos = socket.getaddrinfo(normalized.value, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise UnsafeTargetError("Target host could not be resolved.") from exc

    resolved_addresses = {
        ipaddress.ip_address(info[4][0])
        for info in address_infos
        if info[4] and info[4][0]
    }
    if not resolved_addresses:
        raise UnsafeTargetError("Target host did not resolve to an IP address.")

    if any(not is_public_ip(address) for address in resolved_addresses):
        raise UnsafeTargetError("Target resolves to a private or reserved IP address.")

    selected_address = sorted(
        resolved_addresses,
        key=lambda address: (address.version, str(address)),
    )[0]
    return ResolvedTarget(host=normalized.value, address=str(selected_address))


def _validate_domain(candidate: str) -> str:
    if len(candidate) > 253 or "." not in candidate:
        raise InvalidTargetError("Only public-looking hostnames are supported.")

    if candidate.endswith(".local"):
        raise InvalidTargetError("Local hostnames are not supported.")

    labels = candidate.split(".")

    if any(not label or not DOMAIN_LABEL_PATTERN.match(label) for label in labels):
        raise InvalidTargetError("Domain labels contain unsupported characters.")

    if labels[-1].isdigit():
        raise InvalidTargetError("Top-level domain must contain letters.")

    return candidate

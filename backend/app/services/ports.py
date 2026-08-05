from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from enum import StrEnum

from app.services.targeting import resolve_public_target

SAFE_PORTS = [80, 443, 22, 25, 53, 3306, 5432, 6379, 8080]


class PortState(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    TIMEOUT = "timeout"


Connector = Callable[[str, int, float], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class PortResult:
    port: int
    state: PortState


async def probe_port(
    host: str,
    port: int,
    timeout_seconds: float = 1.0,
    connector: Connector | None = None,
) -> PortResult:
    connector = connector or _default_connector

    try:
        await connector(host, port, timeout_seconds)
    except TimeoutError:
        state = PortState.TIMEOUT
    except (ConnectionRefusedError, OSError):
        state = PortState.CLOSED
    else:
        state = PortState.OPEN

    return PortResult(port=port, state=state)


async def probe_standard_ports(
    host: str,
    timeout_seconds: float = 1.0,
    connector: Connector | None = None,
) -> list[PortResult]:
    connector_host = host
    if connector is None:
        connector_host = resolve_public_target(host).address

    tasks = [
        probe_port(connector_host, port, timeout_seconds=timeout_seconds, connector=connector)
        for port in SAFE_PORTS
    ]
    return list(await asyncio.gather(*tasks))


async def _default_connector(host: str, port: int, timeout_seconds: float) -> None:
    resolved_target = resolve_public_target(host)
    reader, writer = await asyncio.wait_for(
        asyncio.open_connection(resolved_target.address, port),
        timeout_seconds,
    )
    writer.close()
    await writer.wait_closed()

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

import httpx

Fetcher = Callable[[str], Awaitable[Any]]


@dataclass(frozen=True, slots=True)
class HttpObservation:
    http_reachable: bool
    https_reachable: bool
    final_http_url: str | None
    final_https_url: str | None
    redirect_target: str | None


@dataclass(frozen=True, slots=True)
class HttpScanResult:
    observation: HttpObservation
    headers: dict[str, str]


async def probe_http_target(
    target: str,
    *,
    fetcher: Fetcher | None = None,
    timeout_seconds: float = 5.0,
) -> HttpScanResult:
    if fetcher is None:
        async with httpx.AsyncClient(
            timeout=timeout_seconds,
            headers={"User-Agent": "vsw-defensive-scanner/0.1"},
            follow_redirects=True,
        ) as client:
            return await _probe_with_fetcher(target, client.get)

    return await _probe_with_fetcher(target, fetcher)


async def _probe_with_fetcher(target: str, fetcher: Fetcher) -> HttpScanResult:
    http_response = await _try_fetch(fetcher, f"http://{target}")
    https_response = await _try_fetch(fetcher, f"https://{target}")

    selected_headers: dict[str, str] = {}
    if https_response is not None:
        selected_headers = dict(https_response.headers)
    elif http_response is not None:
        selected_headers = dict(http_response.headers)

    return HttpScanResult(
        observation=HttpObservation(
            http_reachable=http_response is not None,
            https_reachable=https_response is not None,
            final_http_url=str(http_response.url) if http_response is not None else None,
            final_https_url=str(https_response.url) if https_response is not None else None,
            redirect_target=_derive_redirect_target(http_response, target),
        ),
        headers=selected_headers,
    )


async def _try_fetch(fetcher: Fetcher, url: str) -> Any | None:
    try:
        return await fetcher(url)
    except Exception:
        return None


def _derive_redirect_target(response: Any | None, target: str) -> str | None:
    if response is None:
        return None

    final_url = str(response.url)
    original_url = f"http://{target}"
    return final_url if final_url != original_url else None

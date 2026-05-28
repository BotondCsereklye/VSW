from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class HttpObservation:
    http_reachable: bool
    https_reachable: bool
    final_http_url: str | None
    final_https_url: str | None
    redirect_target: str | None

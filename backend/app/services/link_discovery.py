from __future__ import annotations

from collections.abc import Callable
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, urlunparse

import httpx

HtmlFetcher = Callable[[str], tuple[str, str]]


class _AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        for attr_name, value in attrs:
            if attr_name.lower() == "href" and value:
                self.hrefs.append(value.strip())
                return


def discover_links_for_target(
    target: str,
    *,
    limit: int = 20,
    fetcher: HtmlFetcher | None = None,
    timeout_seconds: float = 5.0,
) -> list[str]:
    if limit < 1:
        return []

    fetcher = fetcher or _default_fetcher(timeout_seconds=timeout_seconds)
    for candidate_url in (f"https://{target}", f"http://{target}"):
        try:
            final_url, html = fetcher(candidate_url)
        except Exception:
            continue
        return _extract_same_origin_links(final_url, html, limit=limit)

    return []


def _default_fetcher(*, timeout_seconds: float) -> HtmlFetcher:
    def fetch(url: str) -> tuple[str, str]:
        with httpx.Client(
            timeout=timeout_seconds,
            follow_redirects=True,
            headers={"User-Agent": "vsw-defensive-scanner/0.1"},
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            return str(response.url), response.text

    return fetch


def _extract_same_origin_links(base_url: str, html: str, *, limit: int) -> list[str]:
    parser = _AnchorParser()
    parser.feed(html)

    parsed_base = urlparse(base_url)
    if not parsed_base.netloc:
        return []

    links: list[str] = []
    seen: set[str] = set()
    for raw_href in parser.hrefs:
        if not raw_href or raw_href.startswith(("#", "javascript:", "mailto:")):
            continue

        absolute_url = urljoin(base_url, raw_href)
        parsed_link = urlparse(absolute_url)
        if parsed_link.scheme not in {"http", "https"}:
            continue
        if parsed_link.netloc != parsed_base.netloc:
            continue

        normalized = urlunparse(
            (
                parsed_link.scheme,
                parsed_link.netloc,
                parsed_link.path or "/",
                "",
                parsed_link.query,
                "",
            )
        )
        if normalized in seen:
            continue

        seen.add(normalized)
        links.append(normalized)
        if len(links) >= limit:
            break

    return links

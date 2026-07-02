# VSW User Guide

## Purpose

VSW is a defensive local scanner for domains and IP addresses. It checks security headers, TLS information, a small safe port list, and selected read-only misconfiguration signals.

## Start

Recommended on Windows:

```powershell
.\launch_vsw_launcher.ps1
```

Alternative with Docker:

```bash
docker compose up --build
```

## Use

1. Open the VSW app at `http://localhost:5173`.
2. Enter a domain or IP you are allowed to assess.
3. Review score groups, findings, history, exports, and link checks.
4. Use the browser extension only as a link-capture helper for the local backend.

## Browser Extension

- Normal in-page links can be pre-scanned before navigation.
- Address-bar and bookmark visits cannot be reliably blocked before loading by Manifest V3.
- Those visits are recorded passively after loading through `webNavigation`.
- `Trust site` skips scans and blocking for that host.
- `Ignore minimum score` still creates reports but skips score-based blocking.

## Limits

No exploits, no brute force, no aggressive scanning, and no authentication attempts.


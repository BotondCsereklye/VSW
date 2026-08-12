# Vulnerability Scanner Web App

[Deutsch](README.md) | **English**

VSW is a defensive fullstack web app for analysing domains or IPs with passive or low-risk checks. It stores reports and visualises the results in a React dashboard.

## What problem does VSW solve?

Many small websites have visible security configuration issues, for example missing security headers, weak TLS setup or exposed standard ports. VSW helps run these low-risk checks locally and presents reports in a way that makes technical findings, evidence and recommendations easier to understand.

## What does it help with?

- Check domains or IPs defensively and locally
- Inspect HTTP security headers, TLS state and a small safe port list
- Store, compare and export scan reports
- Explain findings with risk, evidence and recommendation
- Prepare browser link checks through a local extension
- Present a fullstack security project clearly for portfolio and IMS recruiting

## Documentation

- Architecture and product plan: [docs/architecture-plan.md](docs/architecture-plan.md)
- Demo and user guide: [docs/demo-guide.md](docs/demo-guide.md)
- Mobile and PWA plan: [docs/mobile-plan.md](docs/mobile-plan.md)
- Backend setup and API notes: [backend/README.md](backend/README.md)
- Multilingual user guides: [EN](docs/i18n/README.en.md), [DE](docs/i18n/README.de.md), [HU](docs/i18n/README.hu.md), [SR](docs/i18n/README.sr.md), [RU](docs/i18n/README.ru.md)
- Windows one-click launcher: [launch_vsw_launcher.ps1](launch_vsw_launcher.ps1)
- Windows shortcut installer: [install_vsw_launcher.ps1](install_vsw_launcher.ps1)
- Browser extension MVP: `extensions/vsw-link-capture`

## Safety Scope

This project is intentionally defensive:

- No exploits
- No brute force
- No aggressive port or service scanning
- No bypass of protection mechanisms
- No authentication attempts

Only scan systems you own or systems where you have explicit permission.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, optional local SQLite
- Frontend: React, TypeScript, Vite
- Infrastructure: Docker, Docker Compose
- Tests: Pytest, Vitest, Testing Library
- Local usage: Python-based Windows launcher
- Browser integration: Manifest V3 extension for link capture
- Mobile/PWA: installable React frontend with web manifest
- Frontend languages: English, German, Hungarian, Serbian, Russian

## Current Features

- Target input with domain/IP validation
- Authorised-use warning
- HTTP security header checks
- TLS and certificate analysis
- Safe port check on a small default list
- Misconfiguration detection with recommendations
- Report scoring from 0 to 100
- Persistent reports with detail view
- JSON and CSV export
- Target history with simple trend display
- Guided same-origin link checks
- Windows launcher for setup, start, browser open and service stop
- Browser extension MVP for local backend link capture
- Basic rate limiting in the backend

## Recommended Windows Start

```powershell
Set-Location -LiteralPath "<repo-path>"
.\launch_vsw_launcher.ps1
```

The launcher is the preferred local demo path on Windows. It detects Python `3.12+`, prepares the backend environment if needed, starts backend and frontend and provides direct links to the app and API docs.

Install a desktop shortcut:

```powershell
Set-Location -LiteralPath "<repo-path>"
.\install_vsw_launcher.ps1
```

## Local Setup Without Docker

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Default backend URL:

```text
http://localhost:8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

## Docker Setup

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Tests

Backend:

```bash
cd backend
. .venv/bin/activate
pytest
ruff check .
```

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Browser extension:

```bash
node --check extensions/vsw-link-capture/background.js
node --check extensions/vsw-link-capture/content-script.js
node --check extensions/vsw-link-capture/popup.js
node --check extensions/vsw-link-capture/runtime-fallback.js
node --test extensions/vsw-link-capture/score-gate.test.cjs
node --test extensions/vsw-link-capture/runtime-fallback.test.cjs
```

## Limits

- No CVE correlation from service banners
- No deep fingerprinting
- No auth or session checks
- No content audit of the target application
- No external asset or JavaScript dependency analysis
- No global mobile link blocking
- No offline scanning in the PWA because backend, network and database must be reachable

## Repository Metadata Suggestion

- Description: `Defensive fullstack vulnerability scanner for passive website checks, reports and browser-assisted link review.`
- Topics: `security`, `fastapi`, `react`, `typescript`, `vulnerability-scanner`, `passive-scanner`, `tls`, `security-headers`, `portfolio-project`

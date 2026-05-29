# Vulnerability Scanner Web App

Professionelle defensive Fullstack-Web-App zur sicheren Analyse von Domains oder IPs. Die Anwendung führt ausschließlich passive oder risikoarme Checks aus, speichert Reports in PostgreSQL und visualisiert Ergebnisse in einem modernen React-Dashboard.

## Dokumentation

- Projektarchitektur und Zielbild: [docs/architecture-plan.md](docs/architecture-plan.md)
- Backend-spezifisches Setup und API-Hinweise: [backend/README.md](backend/README.md)

## Sicherheits-Hinweis

Dieses Projekt ist bewusst defensiv gebaut.

- Keine Exploits
- Kein Brute Force
- Keine aggressiven Port- oder Service-Scans
- Keine Umgehung von Schutzmechanismen
- Keine Authentifizierungsversuche

Nur eigene Systeme oder Systeme mit ausdrücklicher Erlaubnis prüfen.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Frontend: React, TypeScript, Vite
- Infrastruktur: Docker, Docker Compose
- Tests: Pytest, Vitest, Testing Library

## Kernfunktionen

- Target-Eingabe mit Domain-/IP-Validierung
- Warnhinweis zur autorisierten Nutzung
- HTTP Security Header Check
- TLS-/Zertifikatsanalyse
- Sicherer Port-Check auf einer kleinen Standardliste
- Misconfiguration-Erkennung mit Empfehlungen
- Erweiterte Read-only Checks fuer unsichere Header-Werte und Cookie-Flags
- Report-Scoring von 0 bis 100
- Persistente Reports mit Detailansicht
- Dashboard mit Status, Datum und Score
- Background-Scan-Ausführung im Backend
- Einfache Missbrauchsbremse per Rate-Limit

## Projektstruktur

```text
.
├── backend
│   ├── app
│   │   ├── api
│   │   ├── core
│   │   ├── db
│   │   ├── models
│   │   ├── schemas
│   │   └── services
│   ├── scripts
│   ├── tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   └── types
│   └── Dockerfile
├── docs
├── docker-compose.yml
└── README.md
```

## Was geprüft wird

### 1. HTTP Security Header

Die App prüft auf:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### 2. SSL/TLS

- HTTPS erreichbar oder nicht
- Zertifikat vorhanden
- Zertifikat gültig oder abgelaufen
- Ablaufdatum
- Issuer
- Sicher prüfbare TLS-Versionen (`TLSv1.2`, `TLSv1.3`)

### 3. Sichere Portliste

Es werden nur diese Ports geprüft:

- `80`
- `443`
- `22`
- `25`
- `53`
- `3306`
- `5432`
- `6379`
- `8080`

Ergebnis pro Port:

- `open`
- `closed`
- `timeout`

### 4. Fehlkonfigurationen

Beispiele für abgeleitete Findings:

- HTTPS nicht erreichbar
- Unsichere HTTP-Redirects
- Fehlende Security Header
- Unsichere CSP- oder Referrer-Policy-Werte
- Fehlende Secure-/HttpOnly-Cookie-Flags
- Offene Datenbankports
- Abgelaufenes TLS-Zertifikat

## Report-Logik

- Startwert: `100`
- Abzug pro `high`: `25`
- Abzug pro `medium`: `12`
- Abzug pro `low`: `5`
- Untergrenze: `0`

Jeder Finding-Eintrag enthält:

- Risikostufe
- technische Beschreibung
- Evidenz
- konkrete Empfehlung

## Doku-Status

- `docs/screenshots/` ist für echte Projekt-Screenshots reserviert.
- Architektur- und Scope-Notizen liegen in `docs/architecture-plan.md`.
- Backend-Details zu Setup, Checks und API liegen in `backend/README.md`.

## Lokales Setup ohne Docker

### Backend

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Ohne zusätzliche Umgebungsvariablen nutzt das Backend lokal standardmäßig `sqlite:///./vsw.db`.

Standard-URL: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Standard-URL: `http://localhost:5173`

Das Frontend erwartet standardmäßig die API unter `http://localhost:8000/api/v1`.

## Docker Setup

1. Beispiel-Konfiguration kopieren:

```bash
cp .env.example .env
```

2. Stack starten:

```bash
docker compose up --build
```

3. Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

## Wichtige Umgebungsvariablen

Siehe `.env.example`.

- `DATABASE_URL`
- `CORS_ORIGINS`
- `RATE_LIMIT_MAX_REQUESTS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `ENABLE_BACKGROUND_SCANS`
- `VITE_API_BASE_URL`

## API-Endpunkte

- `GET /api/v1/health`
- `POST /api/v1/scans`
- `GET /api/v1/scans`
- `GET /api/v1/scans/{scan_id}`

Die Snapshot-Metadaten enthalten zusaetzlich beobachtete Security Header, Redirect-Ziel und fehlende Header fuer schnellere Evidenzpruefung.

### Beispiel: Scan anlegen

```bash
curl -X POST http://localhost:8000/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"target":"example.com"}'
```

## Tests

### Backend

```bash
cd backend
. .venv/bin/activate
pytest
ruff check .
```

### Frontend

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Grenzen des Scanners

- Keine CVE-Korrelation aus Service-Bannern
- Keine tiefen Fingerprinting-Mechanismen
- Keine Auth- oder Session-Prüfungen
- Keine Content-Audits der Zielapplikation
- Keine externen Asset- oder JS-Dependency-Analysen
- Keine historischen Trendvergleiche

## Architekturhinweise

- Scans werden als Datenbankeintrag erstellt und per Background-Runner verarbeitet
- Findings und Report-Snapshots werden persistiert
- Das Frontend lädt Listen- und Detaildaten separat
- CORS ist für lokale Frontend-/Backend-Trennung konfigurierbar

## TDD-Hinweis

Die Umsetzung wurde testgetrieben aufgebaut:

- zuerst Unit- und Integrationstests im Backend
- danach Implementierung der Services und API
- anschließend Frontend-Komponenten- und Workflow-Tests
- danach UI- und Infrastruktur-Ausbau

## Zukunftsideen

- PDF-Export für Reports
- Zeitliche Verlaufsansicht für wiederholte Scans
- Authentifizierung und Team-Workspaces
- Export nach JSON/CSV
- OWASP-orientierte erweiterte Read-only Checklisten
- Optionales Scheduling für regelmäßige Scans

# Vulnerability Scanner Web App

Professionelle defensive Fullstack-Web-App zur sicheren Analyse von Domains oder IPs. Die Anwendung fuehrt ausschliesslich passive oder risikoarme Checks aus, speichert Reports und visualisiert Ergebnisse in einem React-Dashboard.

## Dokumentation

- Projektarchitektur und Zielbild: [docs/architecture-plan.md](docs/architecture-plan.md)
- Backend-Setup und API-Hinweise: [backend/README.md](backend/README.md)

## Sicherheits-Hinweis

Dieses Projekt ist bewusst defensiv gebaut.

- Keine Exploits
- Kein Brute Force
- Keine aggressiven Port- oder Service-Scans
- Keine Umgehung von Schutzmechanismen
- Keine Authentifizierungsversuche

Nur eigene Systeme oder Systeme mit ausdruecklicher Erlaubnis pruefen.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL (lokal optional SQLite)
- Frontend: React, TypeScript, Vite
- Infrastruktur: Docker, Docker Compose
- Tests: Pytest, Vitest, Testing Library

## Aktueller Funktionsumfang (Stand heute)

- Target-Eingabe mit Domain-/IP-Validierung
- Warnhinweis zur autorisierten Nutzung
- HTTP Security Header Check
- TLS-/Zertifikatsanalyse
- Sicherer Port-Check auf kleiner Standardliste
- Misconfiguration-Erkennung mit Empfehlungen
- Erweiterte Read-only Checks fuer unsichere Header-Werte und Cookie-Flags
- Report-Scoring von 0 bis 100
- Persistente Reports mit Detailansicht
- Export von Reports als JSON und CSV
- Verlauf pro Target mit einfacher Trendanzeige
- Dashboard mit Status, Datum und Score
- Background-Scan-Ausfuehrung im Backend
- Einfache Missbrauchsbremse per Rate-Limit

## Was geprueft wird

### 1. HTTP Security Header

Die App prueft auf:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### 2. SSL/TLS

- HTTPS erreichbar oder nicht
- Zertifikat vorhanden
- Zertifikat gueltig oder abgelaufen
- Ablaufdatum
- Issuer
- Sicher pruefbare TLS-Versionen (`TLSv1.2`, `TLSv1.3`)

### 3. Sichere Portliste

Es werden nur diese Ports geprueft:

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

Beispiele fuer abgeleitete Findings:

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

Jeder Finding-Eintrag enthaelt:

- Risikostufe
- technische Beschreibung
- Evidenz
- konkrete Empfehlung

## API-Endpunkte

- `GET /api/v1/health`
- `POST /api/v1/scans`
- `GET /api/v1/scans`
- `GET /api/v1/scans/{scan_id}`
- `GET /api/v1/scans/{scan_id}/history`
- `GET /api/v1/scans/{scan_id}/export?format=json`
- `GET /api/v1/scans/{scan_id}/export?format=csv`

Die Snapshot-Metadaten enthalten zusaetzlich beobachtete Security Header, Redirect-Ziel und fehlende Header fuer schnellere Evidenzpruefung.

## Benutzerhinweise

- Export ist aktuell fuer abgeschlossene Scans gedacht.
- Die Verlaufsansicht gruppiert Scans ueber `normalized_target` und zeigt neue Eintraege zuerst.
- Die Trendanzeige ist bewusst einfach gehalten: verbessert, verschlechtert oder stabil im Vergleich zum vorherigen Score.

## Grenzen des Scanners

- Keine CVE-Korrelation aus Service-Bannern
- Keine tiefen Fingerprinting-Mechanismen
- Keine Auth- oder Session-Pruefungen
- Keine Content-Audits der Zielapplikation
- Keine externen Asset- oder JS-Dependency-Analysen
- Keine tiefgehende Langzeit-Trendanalyse ueber viele Zeitraeume

## Noch nicht umgesetzt

- PDF-Export fuer Reports
- Authentifizierung und Team-Workspaces
- Scheduling fuer regelmaessige Scans
- Groessere OWASP-orientierte Read-only Checklisten ueber die aktuelle v1-Erweiterung hinaus

## Lokales Setup ohne Docker

### Backend

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Ohne zusaetzliche Umgebungsvariablen nutzt das Backend lokal standardmaessig `sqlite:///./vsw.db`.

Standard-URL: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Standard-URL: `http://localhost:5173`

Das Frontend erwartet standardmaessig die API unter `http://localhost:8000/api/v1`.

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

## Architekturhinweise

- Scans werden als Datenbankeintrag erstellt und per Background-Runner verarbeitet.
- Findings und Report-Snapshots werden persistiert.
- Das Frontend laedt Listen- und Detaildaten separat.
- CORS ist fuer lokale Frontend-/Backend-Trennung konfigurierbar.

## Zukunftsideen

- PDF-Export mit Layout fuer Sharing und Audits
- Erweiterte Trendansicht (Zeitreihen, Vergleich mehrerer Scans)
- Weitere OWASP-orientierte Read-only Check-Module
- Optionales, kontrolliertes Scheduling mit klaren Limits
- Rollen-/Rechtemodell fuer Team-Nutzung

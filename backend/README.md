# Backend

FastAPI-Backend fuer die defensive Scan-Anwendung. Dieser Teil des Projekts validiert Targets, erstellt Scans, fuehrt risikoarme Checks aus und liefert Reports an das Frontend.

## Verantwortungsbereich

- Request-Validierung fuer Domains und IPs
- Persistenz von Scans, Findings und Report-Snapshots
- Defensive Header-, TLS- und Port-Pruefungen
- Score-Berechnung und abgeleitete Misconfiguration-Findings
- REST-API fuer Listen-, Detail-, Verlauf- und Export-Workflows
- Snapshot-Evidenz mit fehlenden Headern, Redirect-Zielen und beobachteten Security Headern

## Lokales Setup

Voraussetzungen:

- Python `3.12`

Installation und Start:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

Ohne weitere Konfiguration nutzt das Backend lokal `sqlite:///./vsw.db`. Fuer Docker Compose oder eine eigene PostgreSQL-Instanz kann `DATABASE_URL` per `.env` gesetzt werden.

## Wichtige Umgebungsvariablen

- `DATABASE_URL`: Datenbankverbindung, lokal optional, in Docker Compose auf PostgreSQL gesetzt
- `CORS_ORIGINS`: Kommaseparierte Liste erlaubter Frontend-Origins
- `RATE_LIMIT_MAX_REQUESTS`: Maximale Anzahl an Scan-Erstellungen pro Fenster
- `RATE_LIMIT_WINDOW_SECONDS`: Zeitfenster fuer das Rate Limit
- `ENABLE_BACKGROUND_SCANS`: Aktiviert die asynchrone Scan-Ausfuehrung nach dem Anlegen

## API-Ueberblick

- `GET /api/v1/health`: Health-Check fuer lokale Entwicklung und Container-Healthchecks
- `POST /api/v1/scans`: Validiert das Ziel und erstellt einen neuen Scan
- `GET /api/v1/scans`: Liefert vorhandene Scans fuer das Dashboard
- `GET /api/v1/scans/{scan_id}`: Liefert Findings und Snapshot fuer einen Scan
- `GET /api/v1/scans/{scan_id}/history`: Liefert die letzten Scans fuer dasselbe Target
- `GET /api/v1/scans/{scan_id}/links?limit=12`: Liefert same-origin Link-Kandidaten fuer guided link checks
- `GET /api/v1/scans/{scan_id}/export?format=json`: Export als lesbar formatiertes JSON
- `GET /api/v1/scans/{scan_id}/export?format=csv`: Export als CSV

Die Browser-extension MVP nutzt ebenfalls `POST /api/v1/scans` und uebergibt nur den extrahierten Host als Target.

## Qualitaetssicherung

Tests und statische Checks:

```bash
cd backend
. .venv/bin/activate
pytest
ruff check .
```

Die Integrationstests laufen mit einer temporaeren SQLite-Datenbank. Damit bleiben sie schnell und unabhaengig von Docker oder einer lokalen PostgreSQL-Instanz.

## Read-only Checks v1

Die erste erweiterte Read-only Check-Stufe deckt neben fehlenden Headern auch riskante Konfigurationen ab:

- `Content-Security-Policy` mit `unsafe-inline`
- `Referrer-Policy: unsafe-url`
- Cookies ohne `Secure` und/oder `HttpOnly`
- HTTPS ohne bestaetigte TLSv1.3-Unterstuetzung

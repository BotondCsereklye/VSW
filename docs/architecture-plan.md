# Vulnerability Scanner Web App

## Zielbild

Defensive Fullstack-Web-App fuer sichere, passive oder risikoarme Infrastruktur-Checks gegen eine Domain oder IP mit klarer Warnung zur autorisierten Nutzung. Die Anwendung fuehrt keine Exploits, keine Brute-Force-Angriffe und keine aggressiven Enumeration-Schritte aus.

## Architektur

### Backend

- FastAPI fuer REST-API und Background-Tasks
- SQLAlchemy 2.x mit PostgreSQL als persistente Datenbank
- Service-Layer fuer Validierung, Scan-Orchestrierung, Port-Checks, TLS-Analyse, Header-Checks, Scoring und Misconfiguration-Erkennung
- Router-Schicht fuer saubere API-Endpunkte
- Pydantic-Schemas fuer Request-/Response-Validierung

### Frontend

- React + TypeScript + Vite
- Komponentenbasierte UI mit Dashboard, Detailansicht und klarer Risikovisualisierung
- Polling fuer Status-Updates laufender Scans
- Responsive Layout mit klarer Typografie und professioneller Informationshierarchie

### Browser extension (MVP)

- Manifest V3 extension as link-capture helper
- Context menu actions for link and current tab
- Popup trigger for current page
- Sends only host targets to local backend `POST /api/v1/scans`
- Opens local VSW scan detail page on success
- Contains no offensive logic and no independent scanning engine

### Infrastruktur

- Docker Compose mit `frontend`, `backend`, `postgres`
- Healthchecks und sauberes Startverhalten
- `.env.example` fuer lokale und containerisierte Konfiguration

## Milestones

1. Projektbasis, Architektur, Datenmodell und TDD-Rahmen
2. Backend-Testbasis fuer Validierung, Score-Logik, Port-/Header-/TLS-Checks und API
3. Backend-Implementierung mit Datenbank, Background-Runner und Report-Erzeugung
4. Frontend-Testbasis und Implementierung fuer Dashboard, Formular, Badge-Logik und Report-UI
5. Docker, README, Refactoring und End-to-End-Verifikation
6. Browser-extension MVP fuer lokale Link-Capture-Trigger

## Datenmodell

### Scan

- `id` UUID, Primary Key
- `target` String
- `normalized_target` String
- `target_type` Enum: `domain`, `ip`
- `status` Enum: `pending`, `running`, `completed`, `failed`
- `score` Integer, nullable bis Abschluss
- `summary` Text, nullable
- `started_at` Timestamp, nullable
- `completed_at` Timestamp, nullable
- `error_message` Text, nullable
- `created_at` Timestamp
- `updated_at` Timestamp

### Finding

- `id` UUID, Primary Key
- `scan_id` FK -> `scan.id`
- `category` Enum: `transport`, `headers`, `network`, `misconfiguration`
- `severity` Enum: `low`, `medium`, `high`
- `title` String
- `description` Text
- `recommendation` Text
- `evidence` JSON
- `created_at` Timestamp

### ReportSnapshot

- `id` UUID, Primary Key
- `scan_id` FK -> `scan.id`, unique
- `http_headers` JSON
- `tls_analysis` JSON
- `port_results` JSON
- `misconfigurations` JSON
- `metadata` JSON
- `created_at` Timestamp

## API-Entwurf

- `POST /api/v1/scans`
  - erstellt einen Scan
  - validiert Domain/IP
  - startet Background-Analyse
- `GET /api/v1/scans`
  - listet Scans mit Status, Score und Zeitstempeln
- `GET /api/v1/scans/{scan_id}`
  - liefert Scan-Detaildaten inklusive Findings und Snapshot
- `GET /api/v1/health`
  - einfacher Health-Check

## Scan-Regeln

- Nur Zielvalidierung fuer Domain oder IP
- Nur sichere Portliste: `80, 443, 22, 25, 53, 3306, 5432, 6379, 8080`
- Kurze Timeouts
- Keine Banner-Enumeration, keine Authentifizierungsversuche, keine Exploit-Tests
- HTTP-Header nur ueber normale Requests
- TLS-Infos nur ueber sichere Handshakes und Zertifikatspruefung

## Scoring-Strategie

- Basisscore `100`
- Punktabzug pro Finding:
  - `high`: 25
  - `medium`: 12
  - `low`: 5
- Score-Minimum `0`
- Zusatzerkenntnisse werden in Findings mit technischer Erklaerung und Handlungsempfehlung gespeichert

## Teststrategie

### Backend

- Unit Tests fuer:
  - Target-Validierung
  - Header-Auswertung
  - TLS-Auswertung
  - Port-Check-Zustandsabbildung
  - Misconfiguration-Regeln
  - Score-Berechnung
- Integration Tests fuer:
  - Scan-Erstellung
  - Scan-Liste
  - Scan-Details
  - Fehlerfaelle bei ungueltigem Input

### Frontend

- Component Tests fuer:
  - `TargetInput`
  - `ScanStatusBadge`
  - `ScoreBadge`
  - `FindingCard`
  - `ScanDashboard`
  - `ReportDetail`
- API-nahe UI-Tests mit Mock-Responses fuer Lade- und Fehlerzustaende

### Extension

- Manuelle Checks fuer:
  - extension load in developer mode
  - link context menu trigger
  - current-tab context menu trigger
  - popup trigger
  - clear error output when backend is offline

## TDD-Arbeitsweise

- Jeder Funktionsblock startet mit Tests
- Danach minimale Implementierung
- Danach Refactoring
- Commits bleiben klein, fachlich getrennt und nachvollziehbar

## Git-Strategie

- Mindestens 30 Commits
- Commit-Nachrichten im Imperativ, fachlich praezise
- Regelmaessige Refactoring-Commits

## Nicht-Ziele

- Keine Exploit-Mechaniken
- Kein Brute Force
- Keine WAF-Umgehung
- Kein Fingerprinting ueber aggressive Protokolltricks
- Keine eigenstaendige Scan-Engine in der Browser extension

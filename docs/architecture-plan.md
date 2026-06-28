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
- Dashboard-Gruppierung nach Score-Klassen `75+`, `50+`, `25+`, `0+` und separater Pending-Gruppe
- Polling fuer Status-Updates laufender Scans
- Responsive Layout mit klarer Typografie und professioneller Informationshierarchie

### Browser-Extension (MVP)

- Manifest-V3-Extension als Link-Capture-Helfer
- Kontextmenue-Aktionen fuer Link und aktuellen Tab
- Popup-Trigger fuer die aktuelle Seite
- Popup-Flow fuer `Scan and visit target` mit konfigurierbarem Mindestscore
- Live-Capture im Content Script fuer normale In-Page-Link-Klicks mit Pre-Scan-Gate
- Sendet nur Host-Ziele an das lokale Backend `POST /api/v1/scans`
- Oeffnet die lokale VSW-Scan-Detailseite bei Kontext- oder Popup-Trigger
- Enthält keine offensive Logik und keine eigenstaendige Scan-Engine

### Infrastruktur

- Docker Compose mit `frontend`, `backend`, `postgres`
- Healthchecks und sauberes Startverhalten
- `.env.example` fuer lokale und containerisierte Konfiguration

### Windows-Bedien-Schicht

- Lokale Launcher-App auf Basis von Python `tkinter`
- Nutzt die bestehende Backend- und Frontend-Architektur, statt eine zweite Scanner-Engine einzufuehren
- Ermittelt Python `3.12+`, erstellt bei Bedarf `backend/.venv`, installiert fehlende Abhaengigkeiten und startet beide Services gemeinsam
- Oeffnet App und API-Doku direkt aus der GUI

## Warum Launcher und Extension zusammen sinnvoll sind

- Die eigentlichen defensiven Checks liegen im lokalen Backend und brauchen Python, TLS-Logik, Datenpersistenz und kontrollierte Netzwerkaufrufe.
- Der Launcher reduziert die lokale Start-Reibung deutlich und ersetzt das Terminal-Jonglieren.
- Die Browser-Extension erweitert die Bedienung, ohne die Scan-Logik in den Browser zu verschieben.
- So bleibt die Sicherheitslogik zentral im lokalen Dienst und die Extension ist nur eine Bedien-Erweiterung.

## Milestones

1. Projektbasis, Architektur, Datenmodell und TDD-Rahmen
2. Backend-Testbasis fuer Validierung, Score-Logik, Port-/Header-/TLS-Checks und API
3. Backend-Implementierung mit Datenbank, Background-Runner und Report-Erzeugung
4. Frontend-Testbasis und Implementierung fuer Dashboard, Formular, Badge-Logik und Report-UI
5. Docker, README, Refactoring und End-to-End-Verifikation
6. Windows-Launcher fuer Ein-Klick-Start und demo-taugliche lokale Bedienung
7. Browser-Extension-MVP fuer lokale Link-Capture-Trigger und Live-Pre-Scan

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
- `GET /api/v1/scans/{scan_id}/history`
  - liefert die letzten Scans fuer dasselbe Target
- `GET /api/v1/scans/{scan_id}/links`
  - liefert same-origin Link-Kandidaten fuer guided Folge-Scans
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
  - Verlauf, Export und guided link checks
  - Fehlerfaelle bei ungueltigem Input

### Frontend

- Component Tests fuer:
  - `TargetInput`
  - `ScanStatusBadge`
  - `ScoreBadge`
  - `FindingCard`
  - `ScanDashboard`
  - Score-Klassifizierung der Scan-Liste
  - `ReportDetail`
- API-nahe UI-Tests mit Mock-Responses fuer Lade- und Fehlerzustaende

### Extension

- Manuelle Checks fuer:
  - Laden im Entwicklermodus
  - Website-Zugriff auf allen Websites
  - Link-Kontextmenue-Trigger
  - Current-Tab-Kontextmenue-Trigger
  - Popup-Trigger
  - Mindestscore-Speicherung und Score-Gate-Entscheidungen
  - Live-Capture fuer normale In-Page-Links
  - klares Fehlerverhalten bei offline Backend

### Launcher

- Manuelle Verifikation auf Windows:
  - Python `3.12+` wird erkannt
  - Setup funktioniert ohne manuelle Terminal-Schritte
  - Backend und Frontend starten gemeinsam
  - App und API-Doku lassen sich oeffnen
  - Stop beendet beide Prozesse sauber

## TDD-Arbeitsweise

- Jeder Funktionsblock startet mit Tests
- Danach minimale Implementierung
- Danach Refactoring
- Commits bleiben klein, fachlich getrennt und nachvollziehbar

## Nicht-Ziele

- Keine Exploit-Mechaniken
- Kein Brute Force
- Keine WAF-Umgehung
- Kein Fingerprinting ueber aggressive Protokolltricks
- Keine Browser-Extension mit eigener Scan-Engine

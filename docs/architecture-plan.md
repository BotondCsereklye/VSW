# Vulnerability Scanner Web App

## Zielbild

Defensive Fullstack-Web-App für sichere, passive oder risikoarme Infrastruktur-Checks gegen eine Domain oder IP mit klarer Warnung zur autorisierten Nutzung. Die Anwendung führt keine Exploits, keine Brute-Force-Angriffe und keine aggressiven Enumeration-Schritte aus.

## Architektur

### Backend

- FastAPI für REST-API und Background-Tasks
- SQLAlchemy 2.x mit PostgreSQL als persistente Datenbank
- Service-Layer für Validierung, Scan-Orchestrierung, Port-Checks, TLS-Analyse, Header-Checks, Scoring und Misconfiguration-Erkennung
- Router-Schicht für saubere API-Endpunkte
- Pydantic-Schemas für Request-/Response-Validierung

### Frontend

- React + TypeScript + Vite
- Komponentenbasierte UI mit Dashboard, Detailansicht und klarer Risikovisualisierung
- Dashboard-Gruppierung nach Score-Klassen `75+`, `50+`, `25+`, `0+` und separater Pending-Gruppe
- Polling für Status-Updates laufender Scans
- Responsive Layout mit klarer Typografie und professioneller Informationshierarchie
- i18n-Grundgerüst mit Englisch als Fallback und UI-Sprachen Deutsch, Ungarisch, Serbisch und Russisch

### Browser-Extension (MVP)

- Manifest-V3-Extension als Link-Capture-Helfer
- Kontextmenü-Aktionen für Link und aktuellen Tab
- Popup-Trigger für die aktuelle Seite
- Popup-Flow für `Scan and visit target` mit konfigurierbarem Mindestscore
- Live-Capture im Content Script für normale In-Page-Link-Klicks mit Pre-Scan-Gate
- Passive Erfassung von Adresszeilen-, Bookmark- und Browser-UI-Navigationen über `webNavigation`
- Sendet nur Host-Ziele an das lokale Backend `POST /api/v1/scans`
- Öffnet die lokale VSW-Scan-Detailseite bei Kontext- oder Popup-Trigger
- Runtime-Fallback verhindert dauerhaft hängende Tabs, wenn eine bereits injizierte Extension-Runtime deaktiviert, entfernt oder neu geladen wurde
- Backend-Health-Check verhindert Phantom-Scans, wenn Laptop, Launcher oder Backend nach Sleep/Restart offline sind
- Host-Regeln werden zentral normalisiert, damit `www.`-Hosts, Subdomains und URL-basierte Regeln stabil verglichen werden
- Nutzt bewusst minimale Berechtigungen und keine Browserhistorie-Berechtigung
- Enthält keine offensive Logik und keine eigenständige Scan-Engine

### Infrastruktur

- Docker Compose mit `frontend`, `backend`, `postgres`
- Healthchecks und sauberes Startverhalten
- `.env.example` für lokale und containerisierte Konfiguration

### Windows-Bedien-Schicht

- Lokale Launcher-App auf Basis von Python `tkinter`
- Nutzt die bestehende Backend- und Frontend-Architektur, statt eine zweite Scanner-Engine einzuführen
- Ermittelt Python `3.12+`, erstellt bei Bedarf `backend/.venv`, installiert fehlende Abhängigkeiten und startet beide Services gemeinsam
- Öffnet App und API-Doku direkt aus der GUI
- Erkennt bereits belegte lokale Ports und nutzt vorhandene Dienste wieder, statt weitere Prozesse zu starten
- Kann per `install_vsw_launcher.ps1` eine Desktop- oder Startmenü-Verknüpfung erzeugen

### Bedien-Roadmap

Kurzfristig bleibt der Python/Tkinter-Launcher der empfohlene lokale Weg, weil er wenig zusätzlichen Architekturaufwand erzeugt und die bestehende Scanner-Logik direkt nutzt. Für weniger technische Nutzer ist Docker Desktop mit `docker compose up --build` der nächste realistische Verpackungsschritt. Eine spätere native Desktop-App mit Tauri oder Electron ist möglich, sollte aber erst nach stabiler Extension- und Launcher-Erfahrung geplant werden.

## Rollenabgrenzung der Oberflächen

| Teil | Rolle |
| --- | --- |
| Backend | Scanner-Engine, Datenquelle und API |
| Frontend | Haupt-Dashboard, Reports, Konfiguration und langfristige Safety-Meldungen |
| Extension Background | Browser-Gatekeeper für Pre-Scan und Navigation |
| Content Script | Klick-Abfang und kurze Browser-Toasts |
| Extension Popup | Mini-Fallback für Schnellscan, manuelle Zielprüfung und Dashboard-Link |
| Launcher | Lokaler Starter für Setup, Services, Logs und Links |

Damit bleibt die Produktlogik nachvollziehbar: Die Extension schützt den Browserfluss, das Frontend erklärt und konfiguriert, das Backend analysiert, und der Launcher startet nur die lokale Umgebung.

Nach Sleep/Restart gilt: Das Frontend zeigt Backend offline statt alte Daten als live zu verkaufen, die Extension prüft `/api/v1/health` vor Scan-Erstellung, und alte Tabs dürfen bei Runtime-Verlust nicht dauerhaft blockiert bleiben.

## Warum Launcher und Extension zusammen sinnvoll sind

- Die eigentlichen defensiven Checks liegen im lokalen Backend und brauchen Python, TLS-Logik, Datenpersistenz und kontrollierte Netzwerkaufrufe.
- Der Launcher reduziert die lokale Start-Reibung deutlich und ersetzt das Terminal-Jonglieren.
- Die Browser-Extension erweitert die Bedienung, ohne die Scan-Logik in den Browser zu verschieben.
- So bleibt die Sicherheitslogik zentral im lokalen Dienst und die Extension ist nur eine Bedien-Erweiterung.

## Milestones

1. Projektbasis, Architektur, Datenmodell und TDD-Rahmen
2. Backend-Testbasis für Validierung, Score-Logik, Port-/Header-/TLS-Checks und API
3. Backend-Implementierung mit Datenbank, Background-Runner und Report-Erzeugung
4. Frontend-Testbasis und Implementierung für Dashboard, Formular, Badge-Logik und Report-UI
5. Docker, README, Refactoring und End-to-End-Verifikation
6. Windows-Launcher für Ein-Klick-Start und demo-taugliche lokale Bedienung
7. Browser-Extension-MVP für lokale Link-Capture-Trigger und Live-Pre-Scan
8. Produktpolitur mit i18n, passiver Navigationserfassung und klarerer lokaler Bedienung

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
  - liefert die letzten Scans für dasselbe Target
- `GET /api/v1/scans/{scan_id}/links`
  - liefert same-origin Link-Kandidaten für guided Folge-Scans
- `GET /api/v1/health`
  - einfacher Health-Check

## Scan-Regeln

- Nur Zielvalidierung für Domain oder IP
- Nur sichere Portliste: `80, 443, 22, 25, 53, 3306, 5432, 6379, 8080`
- Kurze Timeouts
- Keine Banner-Enumeration, keine Authentifizierungsversuche, keine Exploit-Tests
- HTTP-Header nur über normale Requests
- TLS-Infos nur über sichere Handshakes und Zertifikatsprüfung
- Zusätzliche Header-Wertprüfung für schwaches HSTS, unwirksames `nosniff` und zu breite Permissions-Policy
- Zusätzliche TLS-Härtungshinweise für bald ablaufende Zertifikate und nicht bestätigte TLSv1.3-Unterstützung

## Scoring-Strategie

- Basisscore `100`
- Punktabzug pro Finding:
  - `high`: 25
  - `medium`: 12
  - `low`: 5
- Score-Minimum `0`
- Zusatzerkenntnisse werden in Findings mit technischer Erklärung und Handlungsempfehlung gespeichert

## Teststrategie

### Backend

- Unit Tests für:
  - Target-Validierung
  - Header-Auswertung
  - TLS-Auswertung
  - Port-Check-Zustandsabbildung
  - Misconfiguration-Regeln
  - Score-Berechnung
- Integration Tests für:
  - Scan-Erstellung
  - Scan-Liste
  - Scan-Details
  - Verlauf, Export und guided link checks
  - Fehlerfälle bei ungültigem Input

### Frontend

- Component Tests für:
  - `TargetInput`
  - `ScanStatusBadge`
  - `ScoreBadge`
  - `FindingCard`
  - `ScanDashboard`
  - Score-Klassifizierung der Scan-Liste
  - `ReportDetail`
- API-nahe UI-Tests mit Mock-Responses für Lade- und Fehlerzustände

### Extension

- Manuelle Checks für:
  - Laden im Entwicklermodus
  - Website-Zugriff auf allen Websites
  - Link-Kontextmenü-Trigger
  - Current-Tab-Kontextmenü-Trigger
  - Popup-Trigger
  - Mindestscore-Speicherung und Score-Gate-Entscheidungen
  - Live-Capture für normale In-Page-Links
  - passive Erfassung von Adresszeile, Bookmarks und angehefteten Browser-Links nach Navigation
  - Runtime-Fallback bei verlorener Extension-Runtime
  - klares Fehlerverhalten bei offline Backend

### i18n

- Unit Tests für:
  - Sprachumschalter
  - Speicherung in `localStorage`
  - Englisch-Fallback bei ungültiger gespeicherter Sprache

### Launcher

- Manuelle Verifikation auf Windows:
  - Python `3.12+` wird erkannt
  - Setup funktioniert ohne manuelle Terminal-Schritte
  - Backend und Frontend starten gemeinsam
  - bereits belegte Ports werden klar gemeldet
  - Desktop-Verknüpfung kann erstellt werden
  - App und API-Doku lassen sich öffnen
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
- Kein Fingerprinting über aggressive Protokolltricks
- Keine Browser-Extension mit eigener Scan-Engine

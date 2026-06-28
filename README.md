# Vulnerability Scanner Web App

Professionelle defensive Fullstack-Web-App zur sicheren Analyse von Domains oder IPs. Die Anwendung fuehrt ausschliesslich passive oder risikoarme Checks aus, speichert Reports und visualisiert Ergebnisse in einem React-Dashboard.

## Dokumentation

- Projektarchitektur und Zielbild: [docs/architecture-plan.md](docs/architecture-plan.md)
- Backend-Setup und API-Hinweise: [backend/README.md](backend/README.md)
- Windows-Launcher fuer Ein-Klick-Start: [launch_vsw_launcher.ps1](launch_vsw_launcher.ps1)
- Windows-Shortcut-Installer: [install_vsw_launcher.ps1](install_vsw_launcher.ps1)
- Browser-Extension-MVP: `extensions/vsw-link-capture`

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
- Lokale Bedienung: Windows-Launcher auf Python-Basis
- Browser-Integration: Manifest-V3-Extension fuer Link-Capture

## Aktueller Funktionsumfang

- Target-Eingabe mit Domain-/IP-Validierung
- Warnhinweis zur autorisierten Nutzung
- HTTP Security Header Check
- TLS-/Zertifikatsanalyse
- Sicherer Port-Check auf kleiner Standardliste
- Misconfiguration-Erkennung mit Empfehlungen
- Erweiterte Read-only Checks fuer unsichere Header-Werte und Cookie-Flags
- Zusaetzliche TLS-Read-only Regel bei fehlender TLS 1.3 Unterstuetzung
- Report-Scoring von 0 bis 100
- Persistente Reports mit Detailansicht
- Dashboard-Gruppierung nach Score-Klassen: `75+`, `50+`, `25+`, `0+`
- Export von Reports als JSON und CSV
- Verlauf pro Target mit einfacher Trendanzeige
- Erweiterbare Findings-Liste mit Mehr/Weniger-Ansicht
- Guided link checks fuer same-origin Links mit klickbarer Pruefstrecke
- Windows-Launcher-App fuer Setup, Start, Browser-Open und Service-Stop ohne Terminal-Jonglage
- Browser-Extension-MVP fuer Link-Capture zum lokalen Backend
- Live-Capture fuer normale In-Page-Link-Klicks mit Pre-Scan vor Navigation
- Dashboard mit Status, Datum und Score
- Background-Scan-Ausfuehrung im Backend
- Einfache Missbrauchsbremse per Rate-Limit

## Was geprueft wird

### HTTP Security Header

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### SSL/TLS

- HTTPS erreichbar oder nicht
- Zertifikat vorhanden
- Zertifikat gueltig oder abgelaufen
- Ablaufdatum
- Issuer
- Sicher pruefbare TLS-Versionen (`TLSv1.2`, `TLSv1.3`)

### Sichere Portliste

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

### Fehlkonfigurationen

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
- `GET /api/v1/scans/{scan_id}/links?limit=12`
- `GET /api/v1/scans/{scan_id}/export?format=json`
- `GET /api/v1/scans/{scan_id}/export?format=csv`

Die Snapshot-Metadaten enthalten zusaetzlich beobachtete Security Header, Redirect-Ziel und fehlende Header fuer schnellere Evidenzpruefung.

## Benutzerhinweise

- Fuer Windows ist die Launcher-App der empfohlene Startweg, weil sie Python 3.12+ erkennt, Setup anstosst und Frontend plus Backend gemeinsam startet.
- Export ist aktuell fuer abgeschlossene Scans gedacht.
- JSON-Export wird lesbar formatiert bereitgestellt.
- Die Verlaufsansicht gruppiert Scans ueber `normalized_target` und zeigt neue Eintraege zuerst.
- Die Trendanzeige ist bewusst einfach gehalten: verbessert, verschlechtert oder stabil im Vergleich zum vorherigen Score.
- Guided link checks bleiben defensiv: nur same-origin Links, keine Auth-Bypass-Logik, keine aggressiven Crawl-Strategien.
- Die Browser-Extension ist nur ein Trigger fuer Folge-Scans im lokalen VSW-Backend und enthaelt keine eigene Scan-Engine.

## Browser-Extension (MVP)

Ordner: `extensions/vsw-link-capture`

Funktionen:

- Kontextmenue: `Scan link with VSW` bei Link-Rechtsklick
- Kontextmenue: `Scan current tab with VSW`
- Popup-Button: `Scan current page`
- Popup-Feld: `Scan and visit target`
- Konfigurierbarer Mindestscore vor Weiterleitung
- Live-Capture fuer normale In-Page-Link-Klicks mit Pre-Scan vor Navigation
- Popup-Toggles fuer `Enable live click capture`, `Block navigation on pre-scan failure` und Score-Blocking
- Trigger an lokales Backend: `POST http://127.0.0.1:8000/api/v1/scans`
- Erfolg: VSW-Detailseite fuer den neuen Scan wird bei Popup- oder Kontext-Trigger geoeffnet
- Runtime-Fallback: Falls die Extension in einem bereits offenen Tab deaktiviert, neu geladen oder entfernt wurde, bleibt die Seite nicht dauerhaft haengen. Nach kurzer Fehlertoleranz wird die Navigation normal fortgesetzt.

Wichtige Opera-/Chrome-Hinweise:

- Nach dem Laden der Extension `Developer mode` aktiv lassen
- In `Details` den Website-Zugriff auf `Auf allen Websites` setzen
- Nach Aenderungen oder nach erstem Laden die Zielseite mit `Ctrl+F5` neu laden
- Live-Capture greift nur bei normalen Links im Seiteninhalt, nicht bei Adresszeile, Browser-Tabs oder Browser-Buttons
- Fuer echtes Scan-vor-Besuch bei manuell eingegebenen Domains das Popup-Feld `Scan and visit target` nutzen

Score-Gruppen im Dashboard:

- `75+`: gute Reports
- `50+`: mittlere Reports
- `25+`: schwache Reports
- `0+`: kritische Reports
- `Pending`: laufende oder wartende Scans

Installationsanleitung und manuelle Test-Checkliste:

- `extensions/vsw-link-capture/README.md`

## Empfohlener Windows-Start

### Launcher-App

```powershell
Set-Location -LiteralPath "<repo-pfad>"
.\launch_vsw_launcher.ps1
```

Die Launcher-App ist der bevorzugte Weg fuer lokale Entwicklung und manuelle Demos unter Windows:

- erkennt Python `3.12+` automatisch
- erstellt bei Bedarf `backend/.venv`
- installiert fehlende Abhaengigkeiten
- startet Backend und Frontend ohne zwei offene Terminal-Fenster
- erkennt bereits belegte Ports `8000` und `5173` und meldet klar, dass ein vorhandener Dienst wiederverwendet wird
- oeffnet App und API-Doku direkt aus der GUI
- kann eine Desktop-Verknuepfung fuer den App-Start anlegen
- stoppt beide Services wieder sauber

### Desktop-Verknuepfung installieren

```powershell
Set-Location -LiteralPath "<repo-pfad>"
.\install_vsw_launcher.ps1
```

Optional mit Startmenue-Eintrag:

```powershell
.\install_vsw_launcher.ps1 -StartMenu
```

Die Verknuepfung startet die Launcher-App. Der Launcher richtet bei Bedarf Backend und Frontend ein, zeigt Logs an und stoppt nur die Dienste, die er selbst gestartet hat.

### PowerShell-Fallback

```powershell
Set-Location -LiteralPath "<repo-pfad>"
.\dev.ps1
```

Optional ohne erneute Dependency-Installation:

```powershell
.\dev.ps1 -SkipInstall
```

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

## Grenzen des Scanners

- Keine CVE-Korrelation aus Service-Bannern
- Keine tiefen Fingerprinting-Mechanismen
- Keine Auth- oder Session-Pruefungen
- Keine Content-Audits der Zielapplikation
- Keine externen Asset- oder JS-Dependency-Analysen
- Keine tiefgehende Langzeit-Trendanalyse ueber viele Zeitraeume
- Keine Vollscanner-Extension direkt im Browser, weil die eigentlichen defensiven Checks bewusst im lokalen Backend bleiben
- Browser-Limitation: Bereits injizierte Content Scripts koennen in offenen Tabs bis zum Reload verbleiben. Der Extension-Fallback verhindert dauerhaft kaputte Tabs, indem er bei Runtime-Verlust nach kurzer Wartezeit weiterleitet.

## Noch nicht umgesetzt

- PDF-Export fuer Reports
- Authentifizierung und Team-Workspaces
- Scheduling fuer regelmaessige Scans
- Groessere OWASP-orientierte Read-only Checklisten ueber die aktuelle v1-Erweiterung hinaus

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

### Browser-Extension

```bash
node --check extensions/vsw-link-capture/background.js
node --check extensions/vsw-link-capture/content-script.js
node --check extensions/vsw-link-capture/popup.js
node --check extensions/vsw-link-capture/runtime-fallback.js
node --test extensions/vsw-link-capture/score-gate.test.cjs
node --test extensions/vsw-link-capture/runtime-fallback.test.cjs
```

## Architekturhinweise

- Scans werden als Datenbankeintrag erstellt und per Background-Runner verarbeitet.
- Findings und Report-Snapshots werden persistiert.
- Das Frontend laedt Listen- und Detaildaten separat.
- CORS ist fuer lokale Frontend-/Backend-Trennung konfigurierbar.
- Der Windows-Launcher ist eine Bedien-Schicht ueber dem bestehenden Backend und Frontend, keine alternative Scanner-Engine.

## Zukunftsideen

- PDF-Export mit Layout fuer Sharing und Audits
- Erweiterte Trendansicht (Zeitreihen, Vergleich mehrerer Scans)
- Weitere OWASP-orientierte Read-only Check-Module
- Optionales, kontrolliertes Scheduling mit klaren Limits
- Rollen-/Rechtemodell fuer Team-Nutzung
- Browser-Extension-Ausbau mit klarerem Statusbild fuer aktive Pre-Scans und bekannte Browser-Limitationen

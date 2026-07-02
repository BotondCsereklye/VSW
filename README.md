# Vulnerability Scanner Web App

Professionelle defensive Fullstack-Web-App zur sicheren Analyse von Domains oder IPs. Die Anwendung führt ausschliesslich passive oder risikoarme Checks aus, speichert Reports und visualisiert Ergebnisse in einem React-Dashboard.

## Dokumentation

- Projektarchitektur und Zielbild: [docs/architecture-plan.md](docs/architecture-plan.md)
- Backend-Setup und API-Hinweise: [backend/README.md](backend/README.md)
- Windows-Launcher für Ein-Klick-Start: [launch_vsw_launcher.ps1](launch_vsw_launcher.ps1)
- Windows-Shortcut-Installer: [install_vsw_launcher.ps1](install_vsw_launcher.ps1)
- Browser-Extension-MVP: `extensions/vsw-link-capture`

## Sicherheits-Hinweis

Dieses Projekt ist bewusst defensiv gebaut.

- Keine Exploits
- Kein Brute Force
- Keine aggressiven Port- oder Service-Scans
- Keine Umgehung von Schutzmechanismen
- Keine Authentifizierungsversuche

Nur eigene Systeme oder Systeme mit ausdrücklicher Erlaubnis prüfen.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL (lokal optional SQLite)
- Frontend: React, TypeScript, Vite
- Infrastruktur: Docker, Docker Compose
- Tests: Pytest, Vitest, Testing Library
- Lokale Bedienung: Windows-Launcher auf Python-Basis
- Browser-Integration: Manifest-V3-Extension für Link-Capture

## Aktueller Funktionsumfang

- Target-Eingabe mit Domain-/IP-Validierung
- Warnhinweis zur autorisierten Nutzung
- HTTP Security Header Check
- TLS-/Zertifikatsanalyse
- Sicherer Port-Check auf kleiner Standardliste
- Misconfiguration-Erkennung mit Empfehlungen
- Erweiterte Read-only Checks für unsichere Header-Werte und Cookie-Flags
- Zusätzliche TLS-Read-only Regel bei bald ablaufenden Zertifikaten
- Niedrig gewichteter Härtungshinweis bei nicht bestätigter TLS 1.3 Unterstützung
- Report-Scoring von 0 bis 100
- Persistente Reports mit Detailansicht
- Dashboard-Gruppierung nach Score-Klassen: `75+`, `50+`, `25+`, `0+`
- Export von Reports als JSON und CSV
- Verlauf pro Target mit einfacher Trendanzeige
- Erweiterbare Findings-Liste mit Mehr/Weniger-Ansicht
- Guided link checks f?r same-origin Links mit klickbarer Pr?fstrecke
- Windows-Launcher-App f?r Setup, Start, Browser-Open und Service-Stop ohne Terminal-Jonglage
- Browser-Extension-MVP f?r Link-Capture zum lokalen Backend
- Live-Capture f?r normale In-Page-Link-Klicks mit Pre-Scan vor Navigation
- Extension-Settings direkt in der lokalen VSW-App, inklusive Mindestscore f?r Besuchsfreigabe
- Host-Regeln f?r regelm?ssig gepr?fte Websites: Minimum-Score ignorieren oder Host vertrauen
- Dashboard mit Status, Datum und Score
- Background-Scan-Ausführung im Backend
- Einfache Missbrauchsbremse per Rate-Limit

## Was geprüft wird

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
- Zertifikat gültig oder abgelaufen
- Ablaufdatum
- Issuer
- Sicher prüfbare TLS-Versionen (`TLSv1.2`, `TLSv1.3`)

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

Beispiele für abgeleitete Findings:

- HTTPS nicht erreichbar
- Unsichere HTTP-Redirects
- Fehlende Security Header
- Unsichere CSP- oder Referrer-Policy-Werte
- Schwache `Strict-Transport-Security` max-age-Werte
- Ineffektive `X-Content-Type-Options` Werte
- Zu breit erlaubende `Permissions-Policy` Werte
- Fehlende Secure-/HttpOnly-Cookie-Flags
- Offene Datenbankports
- Abgelaufenes TLS-Zertifikat
- Bald ablaufendes TLS-Zertifikat

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

## API-Endpunkte

- `GET /api/v1/health`
- `POST /api/v1/scans`
- `GET /api/v1/scans`
- `GET /api/v1/scans/{scan_id}`
- `GET /api/v1/scans/{scan_id}/history`
- `GET /api/v1/scans/{scan_id}/links?limit=12`
- `GET /api/v1/scans/{scan_id}/export?format=json`
- `GET /api/v1/scans/{scan_id}/export?format=csv`

Die Snapshot-Metadaten enthalten zusätzlich beobachtete Security Header, Redirect-Ziel und fehlende Header für schnellere Evidenzprüfung.

## Benutzerhinweise

- Für Windows ist die Launcher-App der empfohlene Startweg, weil sie Python 3.12+ erkennt, Setup anstosst und Frontend plus Backend gemeinsam startet.
- Export ist aktuell für abgeschlossene Scans gedacht.
- JSON-Export wird lesbar formatiert bereitgestellt.
- Die Verlaufsansicht gruppiert Scans über `normalized_target` und zeigt neue Einträge zuerst.
- Die Trendanzeige ist bewusst einfach gehalten: verbessert, verschlechtert oder stabil im Vergleich zum vorherigen Score.
- Guided link checks bleiben defensiv: nur same-origin Links, keine Auth-Bypass-Logik, keine aggressiven Crawl-Strategien.
- Die Browser-Extension ist nur ein Trigger für Folge-Scans im lokalen VSW-Backend und enthält keine eigene Scan-Engine.

## Browser-Extension (MVP)

Ordner: `extensions/vsw-link-capture`

Funktionen:

- Kontextmenü: `Scan link with VSW` bei Link-Rechtsklick
- Kontextmenü: `Scan current tab with VSW`
- Popup-Button: `Scan current page`
- Popup-Feld: `Scan and visit target`
- Konfigurierbarer Mindestscore vor Weiterleitung
- Live-Capture f?r normale In-Page-Link-Klicks mit Pre-Scan vor Navigation
- Popup-Toggles f?r `Enable live click capture`, `Block navigation on pre-scan failure` und Score-Blocking
- Host-Regeln in der lokalen VSW-App f?r h?ufig genutzte Websites
- Trigger an lokales Backend: `POST http://127.0.0.1:8000/api/v1/scans`
- Erfolg: VSW-Detailseite für den neuen Scan wird bei Popup- oder Kontext-Trigger geöffnet
- Runtime-Fallback: Falls die Extension in einem bereits offenen Tab deaktiviert, neu geladen oder entfernt wurde, bleibt die Seite nicht dauerhaft hängen. Nach kurzer Fehlertoleranz wird die Navigation normal fortgesetzt.

Wichtige Opera-/Chrome-Hinweise:

- Nach dem Laden der Extension `Developer mode` aktiv lassen
- In `Details` den Website-Zugriff auf `Auf allen Websites` setzen
- Nach Änderungen oder nach erstem Laden die Zielseite mit `Ctrl+F5` neu laden
- Live-Capture greift nur bei normalen Links im Seiteninhalt, nicht bei Adresszeile, Browser-Tabs oder Browser-Buttons
- Für echtes Scan-vor-Besuch bei manuell eingegebenen Domains das Popup-Feld `Scan and visit target` nutzen
- Der Mindestscore kann direkt in der VSW-App unter `Visit gate settings` angepasst werden, wenn die Extension geladen ist und Website-Zugriff auf `localhost`/`127.0.0.1` hat
- Im Bereich `Website rules` können regelmässig gescannte Hosts verwaltet werden. `Ignore minimum score` scannt weiterhin, blockiert aber nicht wegen dem Score. `Trust site` erlaubt Navigation für diesen Host ohne Blocking.

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

Die Launcher-App ist der bevorzugte Weg für lokale Entwicklung und manuelle Demos unter Windows:

- erkennt Python `3.12+` automatisch
- erstellt bei Bedarf `backend/.venv`
- installiert fehlende Abhängigkeiten
- startet Backend und Frontend ohne zwei offene Terminal-Fenster
- erkennt bereits belegte Ports `8000` und `5173` und meldet klar, dass ein vorhandener Dienst wiederverwendet wird
- öffnet App und API-Doku direkt aus der GUI
- kann eine Desktop-Verknüpfung für den App-Start anlegen
- stoppt beide Services wieder sauber

### Desktop-Verknüpfung installieren

```powershell
Set-Location -LiteralPath "<repo-pfad>"
.\install_vsw_launcher.ps1
```

Optional mit Startmenü-Eintrag:

```powershell
.\install_vsw_launcher.ps1 -StartMenu
```

Die Verknüpfung startet die Launcher-App. Der Launcher richtet bei Bedarf Backend und Frontend ein, zeigt Logs an und stoppt nur die Dienste, die er selbst gestartet hat.

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

Ohne zusätzliche Umgebungsvariablen nutzt das Backend lokal standardmässig `sqlite:///./vsw.db`.

Standard-URL: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Standard-URL: `http://localhost:5173`

Das Frontend erwartet standardmässig die API unter `http://localhost:8000/api/v1`.

## Grenzen des Scanners

- Keine CVE-Korrelation aus Service-Bannern
- Keine tiefen Fingerprinting-Mechanismen
- Keine Auth- oder Session-Prüfungen
- Keine Content-Audits der Zielapplikation
- Keine externen Asset- oder JS-Dependency-Analysen
- Keine tiefgehende Langzeit-Trendanalyse über viele Zeiträume
- Keine Vollscanner-Extension direkt im Browser, weil die eigentlichen defensiven Checks bewusst im lokalen Backend bleiben
- Browser-Limitation: Bereits injizierte Content Scripts können in offenen Tabs bis zum Reload verbleiben. Der Extension-Fallback verhindert dauerhaft kaputte Tabs, indem er bei Runtime-Verlust nach kurzer Wartezeit weiterleitet.

## Noch nicht umgesetzt

- PDF-Export für Reports
- Authentifizierung und Team-Workspaces
- Scheduling für regelmässige Scans
- Grössere OWASP-orientierte Read-only Checklisten über die aktuelle v1-Erweiterung hinaus

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
- Das Frontend lädt Listen- und Detaildaten separat.
- CORS ist für lokale Frontend-/Backend-Trennung konfigurierbar.
- Der Windows-Launcher ist eine Bedien-Schicht über dem bestehenden Backend und Frontend, keine alternative Scanner-Engine.

## Zukunftsideen

- PDF-Export mit Layout für Sharing und Audits
- Erweiterte Trendansicht (Zeitreihen, Vergleich mehrerer Scans)
- Weitere OWASP-orientierte Read-only Check-Module
- Optionales, kontrolliertes Scheduling mit klaren Limits
- Rollen-/Rechtemodell für Team-Nutzung
- Browser-Extension-Ausbau mit klarerem Statusbild für aktive Pre-Scans und bekannte Browser-Limitationen

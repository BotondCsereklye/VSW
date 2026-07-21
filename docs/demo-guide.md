# VSW Demo Guide

Diese Anleitung beschreibt, wie VSW für eine lokale Demo oder Portfolio-Präsentation gestartet, gezeigt und erklärt wird.

## Ziel der Demo

VSW wird als lokales defensives Security-Toolkit gezeigt:

- Backend analysiert Domains oder IPs mit risikoarmen Checks.
- Frontend zeigt Reports, Score-Gruppen, Export und Verlauf.
- Browser-Extension unterstützt Link-Capture und Visit-Gate-Entscheide.
- Windows-Launcher reduziert lokale Terminal-Schritte.

VSW ist keine Consumer-App aus einem App Store und kein offensiver Scanner.

## Empfohlene Demo-Variante

Für eine schnelle Demo unter Windows:

```powershell
Set-Location -LiteralPath "<repo-pfad>"
.\launch_vsw_launcher.ps1
```

Danach im Launcher:

1. `Setup or update` ausführen, falls Abhängigkeiten fehlen.
2. `Start VSW` klicken.
3. `Open app` klicken.
4. Optional `Open API docs` für die FastAPI-Dokumentation öffnen.

Standard-URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- API Docs: `http://127.0.0.1:8000/docs`

## Browser-Extension laden

Für Opera, Chrome oder Edge:

1. Erweiterungsseite öffnen:
   - Opera: `opera://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Entwicklermodus aktivieren.
3. `Entpackte Erweiterung laden` wählen.
4. Ordner auswählen: `extensions/vsw-link-capture`
5. Website-Zugriff auf `Auf allen Websites` setzen.
6. Bereits offene Testseiten bei Bedarf neu laden.

## Demo-Ablauf

### 1. Manueller Scan

1. Im Frontend ein erlaubtes Testziel eingeben, zum Beispiel `example.com`.
2. `Start safe scan` klicken.
3. Warten, bis der Report abgeschlossen ist.
4. Score, Findings, TLS-Details und Header-Details zeigen.
5. JSON- oder CSV-Export kurz demonstrieren.

### 2. Report-Dashboard

Zeigen:

- Recent Scan Inbox für neue Reports
- Score-Kategorien `75+`, `50+`, `25+`, `0+`
- einklappbare Kategorien
- Report-Detailansicht
- Verlauf pro Target
- Guided Link Checks

### 3. Visit-Gate-Einstellungen

Im Frontend unter `Visit gate settings` zeigen:

- Live Click Capture an/aus
- Blockieren bei fehlgeschlagenem Pre-Scan
- minimal erlaubter Score
- Blockieren unterhalb des Mindestscore
- Website-Regeln für vertraute Hosts und Score-Ignore

### 4. Extension-Verhalten

Sinnvolle Testfälle:

- Rechtsklick auf einen Link und `Scan link with VSW`
- Popup öffnen und `Scan current page`
- Popup-Feld `Scan and visit target`
- normaler Link-Klick innerhalb einer Webseite

Wichtig für die Erklärung:

- Normale Links innerhalb einer Webseite können vor der Navigation geprüft werden.
- Adressleiste, Lesezeichenleiste und Browser-Buttons können nicht zuverlässig vor dem Laden blockiert werden.
- Diese Browser-UI-Navigationen werden höchstens passiv nach dem Laden erfasst.

## Docker-Variante

Für technischere Nutzer:

```bash
cp .env.example .env
docker compose up --build
```

Docker ist die reproduzierbare Variante für Entwickler. Der Windows-Launcher ist die einfachere lokale Demo-Variante.

Nicht gleichzeitig mehrere Varianten starten, wenn Ports `8000`, `5173` oder `5432` bereits belegt sind.

## Was nicht versprochen wird

- Keine Exploits
- Kein Brute Force
- Keine aggressiven Scans
- Kein mobiles globales Link-Blocking
- Keine Chrome-Web-Store- oder App-Store-Verteilung
- Keine fertige native Desktop-App mit Installer

## Kurzform für Präsentationen

VSW ist ein lokales defensives Security-Toolkit für autorisierte Domain- und IP-Checks. Es kombiniert ein FastAPI-Backend, ein React-Dashboard, Exportfunktionen, einfache Score-Historie und eine Browser-Extension für Link-Capture. Die Lösung ist bewusst defensiv und dokumentiert ihre Browser- und Mobile-Grenzen transparent.

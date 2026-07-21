# VSW Release Checklist

Diese Checkliste dient als Abschlusskontrolle für eine stabile `v1.0.0`-Abgabe.

## Zielbild für `v1.0.0`

VSW wird als lokales defensives Security-Toolkit veröffentlicht:

- GitHub Repository als Hauptabgabe
- Windows-Launcher für einfache lokale Demo-Nutzung
- Docker Compose für reproduzierbare technische Nutzung
- Browser-Extension als `Load unpacked` MVP
- Keine Store-Veröffentlichung und keine Consumer-App-Versprechen

## Muss vor Release erledigt sein

### Repository

- `main` enthält nur geprüfte, gemergte Änderungen.
- Alte Feature-Branches sind gelöscht oder klar begründet.
- Vor dem Löschen von Branches wird geprüft, ob sie bereits in `main` enthalten sind.
- Keine lokalen Datenbanken, Build-Artefakte oder virtuelle Umgebungen sind getrackt.
- `.env.example` ist aktuell.
- README verweist auf Demo Guide, Release Checklist und Extension README.

Branch-Cleanup sicher prüfen:

```bash
git fetch --all --prune
git branch --merged main
git branch -r --merged origin/main
```

Nur Branches löschen, die bereits gemergt oder bewusst verworfen sind. Unklare Arbeitsbranches bleiben erhalten, bis der Inhalt geprüft wurde.

### Windows-Launcher

- `.\launch_vsw_launcher.ps1` startet die Launcher-App.
- `Setup or update` funktioniert auf einem frischen lokalen Checkout.
- `Start VSW` startet Backend und Frontend.
- `Open app` öffnet das Frontend.
- `Open API docs` öffnet die Backend-Dokumentation.
- `Stop services` beendet nur die vom Launcher gestarteten Prozesse.
- Belegte Ports `8000` und `5173` werden verständlich gemeldet.

### Docker

- `.env.example` kann zu `.env` kopiert werden.
- `docker compose up --build` startet Backend, Frontend und Datenbank.
- Frontend ist unter `http://localhost:5173` erreichbar.
- Backend ist unter `http://localhost:8000/docs` erreichbar.
- Docker und Launcher werden in der README als alternative Startwege erklärt.

### Frontend

- Dashboard lädt Scans korrekt.
- Backend-Offline-Status ist sichtbar.
- `Reconnect` funktioniert nach erneutem Backend-Start.
- Recent Scan Inbox und Score-Kategorien sind verständlich getrennt.
- Report-Detailansicht zeigt Findings, TLS, Header, Export und Verlauf.
- Light/Dark Mode funktioniert.
- Sprachumschalter funktioniert.

### Browser-Extension

- Extension lädt ohne Manifest-Fehler.
- Website-Zugriff ist auf `Auf allen Websites` gesetzt.
- Popup zeigt Backend-Status.
- `Scan current page` funktioniert.
- `Scan and visit target` funktioniert.
- Rechtsklick `Scan link with VSW` funktioniert.
- Normale In-Page-Link-Klicks werden geprüft.
- Trusted Hosts werden nicht unnötig blockiert.
- `Ignore minimum score` blockiert nicht nur wegen Score.
- Backend offline erzeugt keine Phantom-Scans.
- Alte Tabs bleiben bei Runtime-Verlust nicht dauerhaft blockiert.

### Mobile/PWA

- Frontend ist auf 360px bis 430px Breite bedienbar.
- PWA-Metadaten sind vorhanden.
- README sagt klar, dass mobile Nutzung kein globales Link-Blocking verspricht.
- APK/Capacitor bleibt Future Work, falls nicht vollständig getestet.

## Checks

### Backend

```bash
cd backend
pytest
ruff check .
```

### Frontend

```bash
cd frontend
npm run lint
npm test -- --run
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

## Manuelle Smoke Tests

1. Windows-Launcher starten.
2. Backend und Frontend starten.
3. `example.com` scannen.
4. Report öffnen.
5. JSON und CSV exportieren.
6. Extension laden.
7. `Scan current page` ausführen.
8. Mindestscore hoch setzen.
9. schwächeres Target prüfen und Blockmeldung kontrollieren.
10. Trusted Host setzen und erneuten Klick prüfen.
11. Backend stoppen.
12. Link in altem Tab klicken.
13. Prüfen, dass keine Phantom-Scans entstehen.

## Release-Schritte

1. Alle offenen PRs prüfen und nur stabile Änderungen mergen.
2. `main` aktualisieren.
3. Checks lokal oder in CI ausführen.
4. README und Demo Guide nochmals gegen aktuellen Stand prüfen.
5. Offene Feature-Branches löschen, wenn sie gemergt oder verworfen sind.
6. GitHub Release oder Tag erstellen:

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

## Bekannte Grenzen für Release Notes

- Browser-Adressleiste und Lesezeichenleiste können nicht zuverlässig vor dem Laden blockiert werden.
- Extension wird als entpackte Developer-Mode-Erweiterung verteilt.
- Windows-Launcher setzt lokal Python und Node voraus.
- Docker ist für reproduzierbare Nutzung gedacht, nicht als Cloud-Deployment.
- Mobile/PWA ist Dashboard- und Report-Nutzung, kein globaler mobiler Browser-Schutz.

## Nicht mehr vor `v1.0.0` anfangen

- App Store oder Chrome Web Store Release
- Native Desktop-App mit Installer
- APK als Hauptabgabe
- Authentifizierung und Teams
- Scheduling-System
- grosser PDF-Designer
- neue offensive oder aggressive Scan-Funktionen

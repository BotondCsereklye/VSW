# VSW Benutzeranleitung

## Zweck

VSW ist ein defensiver lokaler Scanner für Domains und IP-Adressen. Er prüft Security Header, TLS-Informationen, eine kleine sichere Portliste und ausgewählte Read-only Hinweise auf Fehlkonfigurationen.

## Start

Empfohlen unter Windows:

```powershell
.\launch_vsw_launcher.ps1
```

Alternative mit Docker:

```bash
docker compose up --build
```

## Nutzung

1. Öffne die VSW-App unter `http://localhost:5173`.
2. Gib eine Domain oder IP ein, die du prüfen darfst.
3. Prüfe Score-Gruppen, Findings, Verlauf, Exporte und Link Checks.
4. Nutze die Browser-Extension nur als Link-Capture-Hilfe für das lokale Backend.

## Browser-Extension

- Normale Links innerhalb einer Website können vor der Navigation geprüft werden.
- Adresszeile und Bookmarks können durch Manifest V3 nicht zuverlässig vor dem Laden blockiert werden.
- Diese Besuche werden über `webNavigation` nach dem Laden passiv erfasst.
- `Trust site` überspringt Scans und Blocking für diesen Host.
- `Ignore minimum score` erstellt weiter Reports, blockiert aber nicht wegen dem Score.

## Grenzen

Keine Exploits, kein Brute Force, keine aggressiven Scans und keine Authentifizierungsversuche.


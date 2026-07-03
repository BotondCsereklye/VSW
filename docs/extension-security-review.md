# Extension Security Review

## Ziel

Diese Notiz beschreibt, wie die VSW Link Capture Extension sicher gehalten wird und worauf bei fremden Pull Requests geachtet werden muss.

## Aktueller Sicherheitsstand

- Keine externe Script-Quelle in der Extension.
- Keine `eval`- oder `new Function`-Nutzung.
- Keine Browser-History-, Cookie-, Download-, Clipboard-, Bookmark- oder Native-Messaging-Berechtigung.
- Requests der Extension gehen nur an das lokale VSW-Backend `http://127.0.0.1:8000`.
- Die Extension sendet nur Hostnamen an das Backend, nicht den kompletten Seiteninhalt.
- `Trust site` und `Ignore minimum score` werden lokal in `chrome.storage.local` gespeichert.

## Wichtiges Restrisiko

Die Extension braucht breite Website-Berechtigungen, weil sie normale In-Page-Klicks erfassen und passive Navigationen erkennen soll. Dadurch gilt:

- Der aktuelle Code ist defensiv und begrenzt.
- Wenn aber jemand Schadcode in die Extension einbaut, hätte dieser Code Zugriff auf viele besuchte Seiten.
- Deshalb müssen Extension-Änderungen strenger geprüft werden als normale UI-Änderungen.

## Vor jedem Merge prüfen

```powershell
.\tools\audit_extension_safety.ps1
```

Zusätzlich manuell prüfen:

- Keine neuen Berechtigungen in `extensions/vsw-link-capture/manifest.json` ohne klare Begründung.
- Keine externen Script-URLs.
- Keine dynamische Code-Ausführung.
- Keine Datenübertragung an fremde Server.
- Keine neuen PowerShell- oder Python-Installationsschritte, die Code aus dem Internet nachladen.

## Erlaubte Extension-Ziele

- `http://127.0.0.1:8000/api/v1/scans`
- `http://127.0.0.1:5173`
- `http://localhost:5173`

Andere Netzwerkziele brauchen ein bewusstes Review.


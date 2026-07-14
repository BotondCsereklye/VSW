# Mobile-Plan für VSW

VSW bleibt ein defensiver Scanner mit Backend-API, React-Dashboard und Desktop-Browser-Extension. Der mobile Ausbau soll die Bedienung auf Handy-Breiten verbessern und eine PWA-Installation vorbereiten, ohne eine zweite Scanner-Engine oder offensive Funktionen einzuführen.

## Realistisch möglich auf Mobile

- Dashboard, Scan-Formular und Report-Viewer im mobilen Browser oder als installierte PWA nutzen
- neue defensive Scans über die bestehende Backend-API starten
- Reports, Score-Kategorien, Verlauf, Findings und Guided Link Checks ansehen
- Browser DevTools Mobile View und echte Handys im gleichen Netzwerk für Tests nutzen
- später eine kleine Capacitor-App als WebView-Schale um dasselbe Frontend bauen

## Bewusst nicht Hauptziel

- kein globales Link-Blocking wie bei der Desktop-Extension
- keine mobile Vollscanner-Engine in der App
- kein Offline-Scan, weil Backend, Netzwerk und Datenbank erreichbar sein müssen
- keine APK-Builds in dieser Vorbereitung, solange Native-Toolchain, Signierung und Distribution nicht geklärt sind
- keine Umgehung von Browser-, App-Store- oder OS-Schutzmechanismen

## Desktop-Extension vs Mobile-App

Die Desktop-Extension kann Link-Klicks im Browser-Kontext erkennen, Score-Gates anwenden und bei normalen In-Page-Links vor der Navigation eine Entscheidung treffen. Diese Rolle ist an Browser-Extension-APIs gebunden und ist auf Mobile nicht verlässlich global verfügbar.

Die Mobile-App oder PWA ist deshalb als Dashboard, Scanner-Einstieg und Report-Viewer gedacht. Sie spricht mit derselben Backend-API wie das Desktop-Frontend. Sie kann Links anzeigen und defensive Folge-Scans starten, aber sie soll keine systemweite Web-Navigation blockieren.

## Empfohlene Zielarchitektur

| Teil | Rolle auf Mobile |
| --- | --- |
| Backend | FastAPI-Scanner, Persistenz, Score-Berechnung und Export |
| Mobile/PWA-Frontend | Dashboard, Scanner, Report-Viewer und Link-Check-Bedienung |
| Desktop-Extension | Desktop-spezifischer Visit-Gate für Browser-Flows |
| Capacitor-Schale | optionaler späterer APK-Weg, ohne neue Scanner-Logik |

Der empfohlene Weg ist zuerst PWA, danach Capacitor nur als Verpackung desselben Frontends. Das reduziert Doppelimplementierungen und hält die Desktop-Architektur stabil.

## Aktueller PWA-Status

- `frontend/index.html` enthält Mobile-Viewport, Theme-Farbe und Manifest-Link.
- `frontend/public/manifest.webmanifest` beschreibt Name, Kurzname, Start-URL, Standalone-Display und vorhandene SVG-Icons.
- Es gibt bewusst keinen Service Worker und kein Offline-Versprechen.
- Das Backend muss vom Handy erreichbar sein, zum Beispiel über die lokale Netzwerkadresse des Rechners oder einen sauber betriebenen Server.

## Capacitor-Einordnung

Eine minimale Capacitor-Vorbereitung ist sinnvoll, aber erst als nächster Schritt. In dieser Änderung werden keine Capacitor-Abhängigkeiten installiert, weil das neue Native-Dateien, Plattformordner und Build-/Signing-Fragen nach sich ziehen würde.

Spätere Befehle wären ungefähr:

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npx cap init VSW ch.csereklye.vsw --web-dir dist
npm run build
npx cap add android
npx cap open android
```

Vor einem APK-Build müssen API-Basis-URL, CORS, Zertifikate, Android-Network-Security-Konfiguration, App-Icon-Grössen und Signierung geklärt werden.

## Mobile-Testempfehlung

- `cd frontend && npm run lint`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- Browser DevTools mit 360px bis 430px Breite prüfen
- echtes Handy im gleichen Netzwerk testen, wenn Backend und CORS für diese Adresse konfiguriert sind

Die PWA bleibt nur ein Bedien-Client. Defensive Nutzung und Autorisierungspflicht gelten unverändert.

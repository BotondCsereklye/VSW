# VSW korisničko uputstvo

## Svrha

VSW je defanzivni lokalni skener za domene i IP adrese. Proverava security headere, TLS informacije, malu sigurnu listu portova i izabrane read-only signale loše konfiguracije.

## Pokretanje

Preporučeno na Windowsu:

```powershell
.\launch_vsw_launcher.ps1
```

Alternativa sa Dockerom:

```bash
docker compose up --build
```

## Upotreba

1. Otvori VSW app na `http://localhost:5173`.
2. Unesi domen ili IP koji smeš da proveravaš.
3. Pregledaj score grupe, findinge, istoriju, exporte i link checks.
4. Browser extension koristi samo kao link-capture pomoć za lokalni backend.

## Browser Extension

- Normalni linkovi unutar stranice mogu da se provere pre navigacije.
- Address bar i bookmark klikovi se u Manifest V3 ne mogu pouzdano blokirati pre učitavanja.
- Te posete se pasivno beleže posle učitavanja kroz `webNavigation`.
- `Trust site` preskače sken i blokiranje za taj host.
- `Ignore minimum score` i dalje pravi izveštaje, ali ne blokira samo zbog score-a.

## Granice

Nema exploita, nema brute force-a, nema agresivnog skeniranja i nema pokušaja autentifikacije.


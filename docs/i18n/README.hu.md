# VSW felhasználói útmutató

## Cél

A VSW egy defenzív helyi ellenőrző eszköz domainekhez és IP-címekhez. Security headereket, TLS-információkat, egy kis biztonságos portlistát és read-only konfigurációs jeleket vizsgál.

## Indítás

Ajánlott Windows alatt:

```powershell
.\launch_vsw_launcher.ps1
```

Alternatíva Dockerrel:

```bash
docker compose up --build
```

## Használat

1. Nyisd meg a VSW appot: `http://localhost:5173`.
2. Adj meg egy domaint vagy IP-címet, amelyet jogosult vagy ellenőrizni.
3. Nézd meg a score csoportokat, findingokat, előzményeket, exportokat és linkellenőrzéseket.
4. A browser extension csak link-capture segéd a helyi backendhez.

## Browser Extension

- A normál, oldalon belüli linkek előre ellenőrizhetők navigáció előtt.
- A címsor és a bookmark kattintások Manifest V3 alatt nem blokkolhatók megbízhatóan betöltés előtt.
- Ezeket a látogatásokat a `webNavigation` passzívan rögzíti betöltés után.
- `Trust site` kihagyja a skent és a blokkolást az adott hostnál.
- `Ignore minimum score` továbbra is riportot készít, de nem blokkol csak a score miatt.

## Korlátok

Nincs exploit, nincs brute force, nincs agresszív scan, és nincs autentikációs próbálkozás.


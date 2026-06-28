# VSW Link Capture Extension (MVP)

This extension is a defensive helper for local development. It does not scan on its own. It only forwards a URL target to your local VSW backend so VSW can run the existing defensive checks.

## What this MVP does

- Adds context menu action `Scan link with VSW` on right-clicked links
- Adds context menu action `Scan current tab with VSW`
- Provides popup button `Scan current page`
- Provides popup field `Scan and visit target` for manual domains such as `youtube.com`
- Adds live click capture for normal in-page link clicks (http/https)
- Runs pre-scan before navigation and then continues navigation when the score passes
- Auto-scans visited pages after top-level navigation when enabled
- Sends `POST http://127.0.0.1:8000/api/v1/scans` with body `{ "target": "<host>" }`
- Opens local VSW frontend for the new scan detail when scan is triggered from context menu or popup

## Security boundaries

- No exploit functionality
- No brute force
- No port scan logic inside the extension
- No crawling logic
- No data collection beyond the selected URL host for the scan trigger

## Install in Chrome, Edge, or Opera (Developer mode)

1. Open extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Opera: `opera://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select folder: `extensions/vsw-link-capture`
5. Open `Details` and set website access to `On all sites`
6. Reload target pages after changing extension permissions

## Usage

1. Start VSW backend and frontend locally.
2. Right-click a link and choose `Scan link with VSW`, or:
3. Right-click page and choose `Scan current tab with VSW`, or:
4. Click extension icon and press `Scan current page`, or:
5. Enter a target such as `youtube.com` and press `Scan and visit target`.
6. Live capture runs automatically on normal in-page link clicks.
7. VSW opens `http://127.0.0.1:5173/scans/<scan_id>` on success for popup/context-menu triggers.

## Live capture settings

Open the extension popup to configure:

- `Enable live click capture`
- `Block navigation on pre-scan failure`
- `Auto-scan visited pages after navigation`
- `Minimum allowed score before visit`
- `Block navigation when the score is below the minimum`

If strict blocking is enabled, navigation stops when pre-scan cannot be created.

## Manual test checklist

1. Extension loads without manifest errors.
2. `Scan link with VSW` appears on link context menu.
3. `Scan current tab with VSW` appears on page context menu.
4. Triggering a scan creates a new scan entry in VSW.
5. Popup button creates a scan for current tab host.
6. Popup target field scans `youtube.com` first and only opens it when the score passes the minimum.
7. Live click capture creates pre-scan before following clicked links.
8. Auto page scan registers direct visits or JavaScript-driven navigations such as Moodle pages.
9. Live capture is not injected into local VSW pages on `localhost` or `127.0.0.1`.
10. When backend is offline, popup shows a clear error message.
11. When strict blocking is enabled and backend is offline, navigation is blocked.
12. Non-http(s) URLs are rejected with a clear message.

## Troubleshooting

- `Could not reach local VSW backend...`
  - Confirm backend is running on `http://127.0.0.1:8000`.
- Scan not created:
  - Check backend logs for validation or rate-limit responses.
- Context menu missing:
  - Reload extension in developer mode and refresh current page.
- Live capture does not trigger:
  - Confirm website access is set to `On all sites`.
  - Reload the page with `Ctrl+F5`.
  - Test on a normal in-page link, not the browser address bar or tab strip.
- Directly typed pages such as Moodle still need tracking:
  - Keep `Auto-scan visited pages after navigation` enabled.
  - This mode registers the visited page after the browser completes navigation.
- You want true scan-before-visit for a manually entered domain:
  - Use the popup field `Scan and visit target` instead of the browser address bar.

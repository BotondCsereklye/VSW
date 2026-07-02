# VSW Link Capture Extension (MVP)

This extension is a defensive helper for local development. It does not scan on its own. It only forwards a URL target to your local VSW backend so VSW can run the existing defensive checks.

## What this MVP does

- Adds context menu action `Scan link with VSW` on right-clicked links
- Adds context menu action `Scan current tab with VSW`
- Provides popup button `Scan current page`
- Provides popup field `Scan and visit target` for manual domains such as `youtube.com`
- Exposes the same visit-gate settings inside the local VSW app on `localhost:5173`
- Supports host rules inside the local VSW app for regularly scanned websites
- Adds live click capture for normal in-page link clicks (http/https)
- Records completed browser navigations with `webNavigation` so address-bar,
  bookmark-bar, and pinned-link visits still create passive VSW reports
- Runs pre-scan before navigation and then continues navigation when the score passes
- Falls back to normal navigation when an already injected content script loses its extension runtime
- Sends `POST http://127.0.0.1:8000/api/v1/scans` with body `{ "target": "<host>" }`
- Opens local VSW frontend for the new scan detail when scan is triggered from context menu or popup

## Security boundaries

- No exploit functionality
- No brute force
- No port scan logic inside the extension
- No crawling logic
- No data collection beyond the selected URL host for the scan trigger
- No browser history permission

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
- `Minimum allowed score before visit`
- `Block navigation when the score is below the minimum`

The same settings are also available inside the VSW app in the `Visit gate settings`
card. This is the recommended place to change the minimum score during normal use.

The VSW app also shows `Website rules` for hosts that already have scans:

- `Ignore minimum score`: VSW still creates a scan and report, but the extension does not block only because the score is below the global minimum.
- `Trust site`: VSW allows the host without blocking. Use this only for systems you intentionally trust.

If strict blocking is enabled, navigation stops when pre-scan cannot be created.
If score blocking is enabled, navigation stops when the completed VSW report is
below the configured minimum score. The default minimum score is `50`.

## Browser navigation limits

Manifest V3 content scripts can intercept normal links that are clicked inside a
website. That is the only mode where VSW can reliably scan before the browser
continues to the destination.

Browser UI actions are different:

- address-bar entries
- bookmark-bar clicks
- pinned browser shortcuts
- tab-strip actions

Those actions are controlled by the browser UI, not by the page content script.
The extension therefore cannot promise a reliable scan-before-visit block for
them. VSW uses `webNavigation` to record these visits after the page load and
create a passive defensive report instead.

Host rules behave as follows:

- `Trust site`: skip VSW scan and blocking for the configured host and its
  subdomains.
- `Ignore minimum score`: still create VSW reports, but do not block only
  because the score is below the global threshold.

## Runtime fallback

Browser extensions cannot always remove already injected content scripts from open
tabs immediately after the extension is disabled, removed, or reloaded. The content
script therefore uses a short runtime timeout.

If `chrome.runtime.sendMessage` fails or times out, the extension shows a short
message and continues normal navigation. This avoids tabs that feel permanently
broken after changing extension state.

## Developer checks

```bash
node --check extensions/vsw-link-capture/background.js
node --check extensions/vsw-link-capture/content-script.js
node --check extensions/vsw-link-capture/popup.js
node --check extensions/vsw-link-capture/runtime-fallback.js
node --test extensions/vsw-link-capture/score-gate.test.cjs
node --test extensions/vsw-link-capture/runtime-fallback.test.cjs
```

## Manual test checklist

1. Extension loads without manifest errors.
2. `Scan link with VSW` appears on link context menu.
3. `Scan current tab with VSW` appears on page context menu.
4. Triggering a scan creates a new scan entry in VSW.
5. Popup button creates a scan for current tab host.
6. Popup target field scans `youtube.com` first and only opens it when the score passes the minimum.
7. Live click capture creates pre-scan before following clicked links.
8. VSW app shows scanned hosts under `Website rules`.
9. `Ignore minimum score` allows a low-score host while still creating reports.
10. `Trust site` allows the configured host without blocking.
11. Live capture is not injected into local VSW pages on `localhost` or `127.0.0.1`.
12. When backend is offline, popup shows a clear error message.
13. When strict blocking is enabled and backend is offline, navigation is blocked.
14. Non-http(s) URLs are rejected with a clear message.
15. If the extension is reloaded while a tab is open, the next intercepted click continues after runtime fallback instead of staying stuck.

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
- Address-bar or bookmark visits do not block before loading:
  - This is a browser limitation.
  - VSW should still create a passive report shortly after the visit.
- A tab behaved strangely after disabling or reloading the extension:
  - Browser engines may keep old content scripts in open tabs until reload.
  - The fallback now lets navigation continue after a short timeout.
  - Reload the page once if the browser still keeps stale script state.
- You want true scan-before-visit for a manually entered domain:
  - Use the popup field `Scan and visit target` instead of the browser address bar.
- Opera or Chrome marks an older local build as unsafe:
  - Remove the old extension entry.
  - Load the unpacked folder again after pulling the latest code.
  - Confirm the permissions no longer include browser history.

importScripts("score-gate.js");

const MENU_SCAN_LINK = "vsw-scan-link";
const MENU_SCAN_TAB = "vsw-scan-current-tab";
const VSW_API_URL = "http://127.0.0.1:8000/api/v1/scans";
const VSW_HEALTH_URL = "http://127.0.0.1:8000/api/v1/health";
const VSW_APP_BASE_URL = "http://127.0.0.1:5173";
const SETTINGS_KEY = "vswLinkCaptureSettings";
const SCAN_POLL_INTERVAL_MS = 1200;
const SCAN_POLL_TIMEOUT_MS = 20000;
const RECENT_SCAN_TTL_MS = 8000;
const DEFAULT_SETTINGS = {
  liveCaptureEnabled: true,
  blockOnScanFailure: true,
  minimumAllowedScore: 50,
  blockBelowMinimumScore: true,
  trustedHosts: [],
  scoreGateIgnoredHosts: [],
};
const recentlyScannedHosts = new Map();

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettings();

  chrome.contextMenus.create({
    id: MENU_SCAN_LINK,
    title: "Scan link with VSW",
    contexts: ["link"],
  });

  chrome.contextMenus.create({
    id: MENU_SCAN_TAB,
    title: "Scan current tab with VSW",
    contexts: ["page", "action"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_SCAN_LINK) {
    await createScanFromUrl(info.linkUrl);
    return;
  }

  if (info.menuItemId === MENU_SCAN_TAB) {
    const candidateUrl = info.pageUrl || tab?.url;
    await createScanFromUrl(candidateUrl);
  }
});

if (chrome.webNavigation?.onCompleted) {
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId !== 0 || !details.url) {
      return;
    }

    void createPassiveNavigationScan(details.url);
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "scan-target-and-visit") {
        const result = await scanTargetAndVisit(message.target);
        sendResponse(result);
        return;
      }

      if (message?.type === "scan-current-tab") {
        const tab = await getActiveTab();
        const result = await createScanFromUrl(tab?.url);
        sendResponse(result);
        return;
      }

      if (message?.type === "gate-navigation") {
        const result = await gateNavigation(message.url);
        sendResponse(result);
        return;
      }

      if (message?.type === "open-scan-report") {
        await openOrFocusScanView(message.scanId, message.notice || {});
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "open-dashboard") {
        await openOrFocusVswApp(VSW_APP_BASE_URL);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "get-backend-status") {
        const reachable = await isBackendReachable();
        sendResponse({
          ok: true,
          reachable,
          message: reachable
            ? "VSW backend is reachable."
            : "VSW backend is offline. Start VSW to scan this site.",
        });
        return;
      }

      if (message?.type === "get-settings") {
        const settings = await getSettings();
        sendResponse({ ok: true, settings });
        return;
      }

      if (message?.type === "set-settings") {
        const settings = await setSettings(message.settings || {});
        sendResponse({ ok: true, settings });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type." });
    } catch (error) {
      sendResponse({
        ok: false,
        error: normalizeError(error),
      });
    }
  })();

  return true;
});

async function createScanFromUrl(rawUrl, options = {}) {
  const parsed = extractTarget(rawUrl);
  if (!parsed.ok) {
    return parsed;
  }

  return createScanFromTarget(parsed.target, {
    ...options,
    visitUrl: rawUrl,
  });
}

async function createScanFromTarget(target, options = {}) {
  const openScanView = options.openScanView ?? true;
  const waitForCompletion = options.waitForCompletion ?? false;

  const backendReachable = await isBackendReachable();
  if (!backendReachable) {
    return {
      ok: false,
      error: "VSW backend is offline. Start VSW to scan this site.",
      backendOffline: true,
      target,
    };
  }

  try {
    const response = await fetch(VSW_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target }),
    });

    const body = await parseJsonSafe(response);
    if (!response.ok) {
      const detail = body?.detail || `Backend returned status ${response.status}.`;
      return {
        ok: false,
        error: detail,
      };
    }

    const scanId = body?.id;
    let detail = null;
    if (waitForCompletion && scanId) {
      detail = await waitForScanCompletion(scanId);
    }

    if (openScanView && scanId) {
      await openOrFocusScanView(scanId);
    } else if (openScanView) {
      await openOrFocusVswApp(VSW_APP_BASE_URL);
    }

    rememberScannedHost(target);

    return {
      ok: true,
      message: `Scan created for ${target}.`,
      scanId: scanId || null,
      detail,
      target,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach local VSW backend at ${VSW_API_URL}.`,
      details: normalizeError(error),
    };
  }
}

async function createPassiveNavigationScan(rawUrl) {
  const parsed = extractTarget(rawUrl);
  if (!parsed.ok || isLocalVswUrl(rawUrl)) {
    return;
  }

  const settings = await getSettings();
  if (!settings.liveCaptureEnabled) {
    return;
  }

  const hostRule = VswScoreGate.getHostRule(parsed.target, settings);
  if (hostRule === "trusted" || wasRecentlyScanned(parsed.target)) {
    return;
  }

  const backendReachable = await isBackendReachable();
  if (!backendReachable) {
    return;
  }

  await createScanFromTarget(parsed.target, {
    openScanView: false,
    waitForCompletion: false,
  });
}

async function gateNavigation(rawUrl) {
  const settings = await getSettings();
  if (!settings.liveCaptureEnabled) {
    return { ok: true, allowNavigation: true, message: "Live capture disabled." };
  }

  const parsedTarget = extractTarget(rawUrl);
  if (parsedTarget.ok && VswScoreGate.getHostRule(parsedTarget.target, settings) === "trusted") {
    return {
      ok: true,
      allowNavigation: true,
      message: `${parsedTarget.target} is trusted in VSW. Navigation continues without blocking.`,
      target: parsedTarget.target,
    };
  }

  const result = await createScanFromUrl(rawUrl, {
    openScanView: false,
    waitForCompletion: true,
  });
  if (result.ok) {
    rememberScannedHost(result.target);
    const ignoresMinimumScore =
      VswScoreGate.getHostRule(result.target, settings) === "ignore-minimum-score";
    const gateSettings = ignoresMinimumScore
      ? { ...settings, blockBelowMinimumScore: false }
      : settings;
    const gateDecision = VswScoreGate.evaluateGateDecision(result.detail, gateSettings);
    if (!gateDecision.allowNavigation) {
      return {
        ok: true,
        allowNavigation: false,
        message: gateDecision.message,
        scanId: result.scanId || null,
        target: result.target || null,
        score: typeof result.detail?.score === "number" ? result.detail.score : null,
        minimumAllowedScore: settings.minimumAllowedScore,
        redirectDelayMs: 3000,
      };
    }

    return {
      ok: true,
      allowNavigation: true,
      message: ignoresMinimumScore
        ? `${result.target} ignores the minimum score gate. ${gateDecision.message || result.message}`
        : gateDecision.message || result.message,
      scanId: result.scanId || null,
      target: result.target || null,
    };
  }

  if (settings.blockOnScanFailure) {
    return {
      ok: true,
      allowNavigation: false,
      message: result.error || "Pre-scan failed.",
      backendOffline: Boolean(result.backendOffline),
    };
  }

  return {
    ok: true,
    allowNavigation: true,
    warning: result.error || "Pre-scan failed. Navigation continues.",
    backendOffline: Boolean(result.backendOffline),
  };
}

async function scanTargetAndVisit(rawTarget) {
  const normalized = normalizeTargetInput(rawTarget);
  if (!normalized.ok) {
    return normalized;
  }

  const settings = await getSettings();
  if (VswScoreGate.getHostRule(normalized.target, settings) === "trusted") {
    await openVisitUrl(normalized.visitUrl);
    return {
      ok: true,
      message: `${normalized.target} is trusted in VSW. Navigation continues without blocking.`,
      scanId: null,
      detail: null,
    };
  }

  const result = await createScanFromTarget(normalized.target, {
    openScanView: false,
    waitForCompletion: true,
  });

  if (!result.ok) {
    return result;
  }

  rememberScannedHost(result.target);
  const ignoresMinimumScore =
    VswScoreGate.getHostRule(result.target, settings) === "ignore-minimum-score";
  const gateDecision = VswScoreGate.evaluateGateDecision(
    result.detail,
    ignoresMinimumScore ? { ...settings, blockBelowMinimumScore: false } : settings,
  );
  if (result.scanId) {
    await openOrFocusScanView(result.scanId);
  }

  if (!gateDecision.allowNavigation) {
    return {
      ok: false,
      error: gateDecision.message,
      scanId: result.scanId || null,
      detail: result.detail,
    };
  }

  await openVisitUrl(normalized.visitUrl);

  return {
    ok: true,
    message: gateDecision.message,
    scanId: result.scanId || null,
    detail: result.detail,
  };
}

async function waitForScanCompletion(scanId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SCAN_POLL_TIMEOUT_MS) {
    const response = await fetch(`${VSW_API_URL}/${scanId}`);
    if (!response.ok) {
      throw new Error(`Could not poll scan ${scanId} (status ${response.status}).`);
    }

    const detail = await parseJsonSafe(response);
    if (detail?.status === "completed" || detail?.status === "failed") {
      return detail;
    }

    await sleep(SCAN_POLL_INTERVAL_MS);
  }

  throw new Error("Timed out while waiting for the defensive scan to finish.");
}

async function isBackendReachable() {
  try {
    const response = await fetch(VSW_HEALTH_URL, {
      method: "GET",
      cache: "no-store",
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

function extractTarget(rawUrl) {
  if (!rawUrl) {
    return { ok: false, error: "No URL provided." };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_error) {
    return { ok: false, error: "Invalid URL." };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, error: "Only http and https links are supported." };
  }

  if (!parsedUrl.hostname) {
    return { ok: false, error: "Could not extract host from URL." };
  }

  return { ok: true, target: parsedUrl.hostname };
}

function normalizeTargetInput(rawTarget) {
  const trimmed = String(rawTarget || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a target." };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsedUrl = new URL(candidate);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { ok: false, error: "Only http and https targets are supported." };
    }

    if (!parsedUrl.hostname) {
      return { ok: false, error: "Could not extract host from target." };
    }

    return {
      ok: true,
      target: parsedUrl.hostname,
      visitUrl: parsedUrl.toString(),
    };
  } catch (_error) {
    return { ok: false, error: "Please enter a valid domain or URL." };
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function openVisitUrl(url) {
  const activeTab = await getActiveTab();
  if (activeTab?.id !== undefined) {
    await chrome.tabs.update(activeTab.id, { url });
    return;
  }

  await chrome.tabs.create({ url });
}

async function openOrFocusScanView(scanId, notice = {}) {
  return openOrFocusVswApp(buildScanViewUrl(scanId, notice));
}

async function openOrFocusVswApp(url) {
  const tabs = await chrome.tabs.query({
    url: [
      `${VSW_APP_BASE_URL}/*`,
      "http://localhost:5173/*",
    ],
  });
  const existingTab = tabs[0];

  if (existingTab?.id !== undefined) {
    await chrome.tabs.update(existingTab.id, { active: true, url });
    if (existingTab.windowId !== undefined) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url });
}

function buildScanViewUrl(scanId, notice = {}) {
  const url = new URL(`${VSW_APP_BASE_URL}/scans/${scanId}`);
  if (notice.type) {
    url.searchParams.set("notice", notice.type);
  }
  if (notice.message) {
    url.searchParams.set("message", notice.message);
  }
  if (notice.target) {
    url.searchParams.set("target", notice.target);
  }
  if (notice.score !== undefined && notice.score !== null) {
    url.searchParams.set("score", String(notice.score));
  }
  if (notice.minimumAllowedScore !== undefined && notice.minimumAllowedScore !== null) {
    url.searchParams.set("minimum", String(notice.minimumAllowedScore));
  }
  url.searchParams.set("ts", String(Date.now()));
  return url.toString();
}

async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeStoredSettings(stored[SETTINGS_KEY]);
}

async function setSettings(candidateSettings) {
  const settings = normalizeStoredSettings(candidateSettings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

async function ensureSettings() {
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

function normalizeStoredSettings(candidate) {
  return VswScoreGate.normalizeSettings(candidate, DEFAULT_SETTINGS);
}

function rememberScannedHost(host) {
  const normalizedHost = String(host || "").trim().toLowerCase();
  if (normalizedHost) {
    recentlyScannedHosts.set(normalizedHost, Date.now());
  }
}

function wasRecentlyScanned(host) {
  const normalizedHost = String(host || "").trim().toLowerCase();
  const scannedAt = recentlyScannedHosts.get(normalizedHost);
  if (!scannedAt) {
    return false;
  }

  if (Date.now() - scannedAt > RECENT_SCAN_TTL_MS) {
    recentlyScannedHosts.delete(normalizedHost);
    return false;
  }

  return true;
}

function isLocalVswUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      (url.port === "5173" || url.port === "8000")
    );
  } catch (_error) {
    return false;
  }
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function normalizeError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

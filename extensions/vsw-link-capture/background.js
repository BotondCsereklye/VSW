importScripts("score-gate.js");

const MENU_SCAN_LINK = "vsw-scan-link";
const MENU_SCAN_TAB = "vsw-scan-current-tab";
const VSW_API_URL = "http://127.0.0.1:8000/api/v1/scans";
const VSW_APP_BASE_URL = "http://127.0.0.1:5173";
const SETTINGS_KEY = "vswLinkCaptureSettings";
const SCAN_POLL_INTERVAL_MS = 1200;
const SCAN_POLL_TIMEOUT_MS = 20000;
const DEFAULT_SETTINGS = {
  liveCaptureEnabled: true,
  blockOnScanFailure: true,
  minimumAllowedScore: 50,
  blockBelowMinimumScore: true,
};

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

    return {
      ok: true,
      message: `Scan created for ${target}.`,
      scanId: scanId || null,
      detail,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach local VSW backend at ${VSW_API_URL}.`,
      details: normalizeError(error),
    };
  }
}

async function gateNavigation(rawUrl) {
  const settings = await getSettings();
  if (!settings.liveCaptureEnabled) {
    return { ok: true, allowNavigation: true, message: "Live capture disabled." };
  }

  const result = await createScanFromUrl(rawUrl, {
    openScanView: false,
    waitForCompletion: true,
  });
  if (result.ok) {
    const gateDecision = VswScoreGate.evaluateGateDecision(result.detail, settings);
    if (!gateDecision.allowNavigation) {
      if (result.scanId) {
        await openOrFocusScanView(result.scanId);
      }
      return {
        ok: true,
        allowNavigation: false,
        message: gateDecision.message,
        scanId: result.scanId || null,
      };
    }

    return {
      ok: true,
      allowNavigation: true,
      message: gateDecision.message || result.message,
      scanId: result.scanId || null,
    };
  }

  if (settings.blockOnScanFailure) {
    return {
      ok: true,
      allowNavigation: false,
      message: result.error || "Pre-scan failed.",
    };
  }

  return {
    ok: true,
    allowNavigation: true,
    warning: result.error || "Pre-scan failed. Navigation continues.",
  };
}

async function scanTargetAndVisit(rawTarget) {
  const normalized = normalizeTargetInput(rawTarget);
  if (!normalized.ok) {
    return normalized;
  }

  const settings = await getSettings();
  const result = await createScanFromTarget(normalized.target, {
    openScanView: false,
    waitForCompletion: true,
  });

  if (!result.ok) {
    return result;
  }

  const gateDecision = VswScoreGate.evaluateGateDecision(result.detail, settings);
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

  const activeTab = await getActiveTab();
  if (activeTab?.id !== undefined) {
    await chrome.tabs.update(activeTab.id, { url: normalized.visitUrl });
  } else {
    await chrome.tabs.create({ url: normalized.visitUrl });
  }

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

async function openOrFocusScanView(scanId) {
  return openOrFocusVswApp(`${VSW_APP_BASE_URL}/scans/${scanId}`);
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

const MENU_SCAN_LINK = "vsw-scan-link";
const MENU_SCAN_TAB = "vsw-scan-current-tab";
const VSW_API_URL = "http://127.0.0.1:8000/api/v1/scans";
const VSW_APP_BASE_URL = "http://127.0.0.1:5173";

chrome.runtime.onInstalled.addListener(() => {
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
  if (message?.type !== "scan-current-tab") {
    return;
  }

  (async () => {
    try {
      const tab = await getActiveTab();
      const result = await createScanFromUrl(tab?.url);
      sendResponse(result);
    } catch (error) {
      sendResponse({
        ok: false,
        error: normalizeError(error),
      });
    }
  })();

  return true;
});

async function createScanFromUrl(rawUrl) {
  const parsed = extractTarget(rawUrl);
  if (!parsed.ok) {
    return parsed;
  }

  try {
    const response = await fetch(VSW_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: parsed.target }),
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
    if (scanId) {
      await chrome.tabs.create({ url: `${VSW_APP_BASE_URL}/scans/${scanId}` });
    } else {
      await chrome.tabs.create({ url: VSW_APP_BASE_URL });
    }

    return {
      ok: true,
      message: `Scan created for ${parsed.target}.`,
      scanId: scanId || null,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach local VSW backend at ${VSW_API_URL}.`,
      details: normalizeError(error),
    };
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

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
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

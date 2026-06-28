const LIVE_CAPTURE_TOAST_ID = "vsw-live-capture-toast";
const RUNTIME_RESPONSE_TIMEOUT_MS = 4500;

document.addEventListener(
  "click",
  (event) => {
    void handleClick(event);
  },
  true,
);

async function handleClick(event) {
  if (event.defaultPrevented) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!anchor) {
    return;
  }

  if (anchor.hasAttribute("download")) {
    return;
  }

  const href = anchor.href;
  if (!href) {
    return;
  }

  const url = parseHttpUrl(href);
  if (!url) {
    return;
  }

  if (isSameDocumentLink(url)) {
    return;
  }

  const openInNewTab = anchor.target === "_blank";

  event.preventDefault();
  event.stopImmediatePropagation();

  showToast("Running defensive pre-scan...");

  let result;
  try {
    result = await sendRuntimeMessageWithTimeout({
      type: "gate-navigation",
      url: href,
    });
  } catch (error) {
    const fallback = VswRuntimeFallback.createRuntimeFallbackDecision(normalizeError(error));
    showToast(fallback.message, true);
    if (fallback.continueNavigation) {
      continueNavigation(href, openInNewTab);
    }
    return;
  }

  if (!result?.ok) {
    showToast(result?.error || "Pre-scan failed.", true);
    return;
  }

  if (!result.allowNavigation) {
    showToast(result.message || "Navigation blocked: pre-scan failed.", true);
    return;
  }

  if (result.warning) {
    showToast(result.warning, true);
  } else {
    showToast("Pre-scan created. Continuing navigation.");
  }

  continueNavigation(href, openInNewTab);
}

function sendRuntimeMessageWithTimeout(message) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("Extension runtime is not available."));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      reject(new Error("Pre-scan response timed out."));
    }, RUNTIME_RESPONSE_TIMEOUT_MS);

    chrome.runtime.sendMessage(message, (response) => {
      window.clearTimeout(timeoutId);
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      resolve(response);
    });
  });
}

function continueNavigation(href, openInNewTab) {
  if (openInNewTab) {
    window.open(href, "_blank", "noopener");
    return;
  }

  window.location.assign(href);
}

function parseHttpUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch (_error) {
    return null;
  }
}

function isSameDocumentLink(targetUrl) {
  const current = new URL(window.location.href);
  return (
    targetUrl.origin === current.origin &&
    targetUrl.pathname === current.pathname &&
    targetUrl.search === current.search &&
    targetUrl.hash !== ""
  );
}

function showToast(message, isError = false) {
  let toast = document.getElementById(LIVE_CAPTURE_TOAST_ID);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = LIVE_CAPTURE_TOAST_ID;
    toast.style.position = "fixed";
    toast.style.right = "16px";
    toast.style.bottom = "16px";
    toast.style.maxWidth = "420px";
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "10px";
    toast.style.fontFamily = "system-ui, -apple-system, Segoe UI, Arial, sans-serif";
    toast.style.fontSize = "12px";
    toast.style.fontWeight = "600";
    toast.style.lineHeight = "1.4";
    toast.style.zIndex = "2147483647";
    toast.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.2)";
    document.documentElement.appendChild(toast);
  }

  toast.style.background = isError ? "#8f2f2f" : "#1a4d2b";
  toast.style.color = "#ffffff";
  toast.textContent = message;

  window.clearTimeout(showToast.hideTimer);
  showToast.hideTimer = window.setTimeout(() => {
    if (toast) {
      toast.remove();
    }
  }, 2800);
}

showToast.hideTimer = 0;

function normalizeError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

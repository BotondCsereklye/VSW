const button = document.getElementById("scanCurrentPageButton");
const statusElement = document.getElementById("status");
const liveCaptureToggle = document.getElementById("liveCaptureEnabled");
const blockOnFailureToggle = document.getElementById("blockOnScanFailure");

init().catch((error) => {
  setStatus(`Failed to initialize popup: ${normalizeError(error)}`, "error");
});

button.addEventListener("click", async () => {
  setBusyState(true);
  setStatus("Creating scan...", "idle");

  try {
    const result = await chrome.runtime.sendMessage({ type: "scan-current-tab" });
    if (!result?.ok) {
      const message = result?.error || "Unknown error while creating scan.";
      setStatus(message, "error");
      return;
    }

    const scanIdPart = result.scanId ? ` (scan ${result.scanId})` : "";
    setStatus(`Scan created successfully${scanIdPart}.`, "ok");
  } catch (error) {
    setStatus(`Failed to contact extension background: ${normalizeError(error)}`, "error");
  } finally {
    setBusyState(false);
  }
});

liveCaptureToggle.addEventListener("change", () => {
  void persistSettings();
});

blockOnFailureToggle.addEventListener("change", () => {
  void persistSettings();
});

async function init() {
  const result = await chrome.runtime.sendMessage({ type: "get-settings" });
  if (!result?.ok) {
    throw new Error(result?.error || "Could not load extension settings.");
  }

  liveCaptureToggle.checked = Boolean(result.settings.liveCaptureEnabled);
  blockOnFailureToggle.checked = Boolean(result.settings.blockOnScanFailure);
  setStatus("Ready.", "ok");
}

async function persistSettings() {
  const settings = {
    liveCaptureEnabled: liveCaptureToggle.checked,
    blockOnScanFailure: blockOnFailureToggle.checked,
  };

  const result = await chrome.runtime.sendMessage({
    type: "set-settings",
    settings,
  });

  if (!result?.ok) {
    setStatus(result?.error || "Failed to save settings.", "error");
    return;
  }

  setStatus("Settings updated.", "ok");
}

function setStatus(message, state) {
  statusElement.textContent = message;
  statusElement.setAttribute("data-state", state);
}

function setBusyState(isBusy) {
  button.disabled = isBusy;
  button.textContent = isBusy ? "Starting..." : "Scan current page";
}

function normalizeError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

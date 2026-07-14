const button = document.getElementById("scanCurrentPageButton");
const scanTargetButton = document.getElementById("scanTargetButton");
const openDashboardButton = document.getElementById("openDashboardButton");
const retryConnectionButton = document.getElementById("retryConnectionButton");
const statusElement = document.getElementById("status");
const liveCaptureStatus = document.getElementById("liveCaptureStatus");
const minimumScoreStatus = document.getElementById("minimumScoreStatus");
const scoreBlockingStatus = document.getElementById("scoreBlockingStatus");
const backendStatus = document.getElementById("backendStatus");
const manualTargetInput = document.getElementById("manualTargetInput");

const DEFAULT_SETTINGS = {
  liveCaptureEnabled: true,
  blockOnScanFailure: true,
  minimumAllowedScore: 50,
  blockBelowMinimumScore: true,
  trustedHosts: [],
  scoreGateIgnoredHosts: [],
};

init().catch((error) => {
  renderSettingsSummary(DEFAULT_SETTINGS);
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

scanTargetButton.addEventListener("click", async () => {
  setBusyState(true);
  setStatus("Running scan before visit...", "idle");

  try {
    const result = await chrome.runtime.sendMessage({
      type: "scan-target-and-visit",
      target: manualTargetInput.value,
    });
    if (!result?.ok) {
      const message = result?.error || "Unknown error while scanning the target.";
      setStatus(message, "error");
      return;
    }

    const score = typeof result.detail?.score === "number" ? ` Score ${result.detail.score}/100.` : "";
    setStatus(`Target cleared for visit.${score}`, "ok");
  } catch (error) {
    setStatus(`Failed to contact extension background: ${normalizeError(error)}`, "error");
  } finally {
    setBusyState(false);
  }
});

openDashboardButton.addEventListener("click", async () => {
  setBusyState(true);
  setStatus("Opening dashboard...", "idle");

  try {
    const result = await chrome.runtime.sendMessage({ type: "open-dashboard" });
    if (!result?.ok) {
      setStatus(result?.error || "Could not open VSW dashboard.", "error");
      return;
    }
    setStatus("Dashboard opened.", "ok");
  } catch (error) {
    setStatus(`Failed to contact extension background: ${normalizeError(error)}`, "error");
  } finally {
    setBusyState(false);
  }
});

retryConnectionButton.addEventListener("click", async () => {
  setBusyState(true);
  setStatus("Checking backend...", "idle");

  try {
    await refreshBackendStatus();
  } catch (error) {
    setStatus(`Failed to contact extension background: ${normalizeError(error)}`, "error");
  } finally {
    setBusyState(false);
  }
});

manualTargetInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    scanTargetButton.click();
  }
});

async function init() {
  const result = await chrome.runtime.sendMessage({ type: "get-settings" });
  if (!result?.ok) {
    throw new Error(result?.error || "Could not load extension settings.");
  }

  renderSettingsSummary(normalizeSettings(result.settings));
  await refreshBackendStatus();
}

function renderSettingsSummary(settings) {
  liveCaptureStatus.textContent = settings.liveCaptureEnabled ? "On" : "Off";
  minimumScoreStatus.textContent = `${settings.minimumAllowedScore}/100`;
  scoreBlockingStatus.textContent = settings.blockBelowMinimumScore ? "On" : "Off";
}

function setStatus(message, state) {
  statusElement.textContent = message;
  statusElement.setAttribute("data-state", state);
}

function setBusyState(isBusy) {
  button.disabled = isBusy;
  scanTargetButton.disabled = isBusy;
  openDashboardButton.disabled = isBusy;
  retryConnectionButton.disabled = isBusy;
  manualTargetInput.disabled = isBusy;
  button.textContent = isBusy ? "Starting..." : "Scan current page";
  scanTargetButton.textContent = isBusy ? "Scanning..." : "Scan and visit target";
  openDashboardButton.textContent = isBusy ? "Opening..." : "Open VSW dashboard";
  retryConnectionButton.textContent = isBusy ? "Checking..." : "Retry connection";
}

async function refreshBackendStatus() {
  const result = await chrome.runtime.sendMessage({ type: "get-backend-status" });
  if (!result?.ok) {
    backendStatus.textContent = "Unknown";
    setStatus(result?.error || "Could not check backend status.", "error");
    return;
  }

  backendStatus.textContent = result.reachable ? "Online" : "Offline";
  setStatus(
    result.reachable
      ? "Ready. Change visit-gate settings in the VSW dashboard."
      : result.message || "VSW backend is offline. Start VSW to scan this site.",
    result.reachable ? "ok" : "warning",
  );
}

function normalizeError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function normalizeSettings(candidate) {
  return {
    liveCaptureEnabled:
      candidate?.liveCaptureEnabled === undefined
        ? DEFAULT_SETTINGS.liveCaptureEnabled
        : Boolean(candidate.liveCaptureEnabled),
    blockOnScanFailure:
      candidate?.blockOnScanFailure === undefined
        ? DEFAULT_SETTINGS.blockOnScanFailure
        : Boolean(candidate.blockOnScanFailure),
    minimumAllowedScore: normalizeMinimumScore(candidate?.minimumAllowedScore),
    blockBelowMinimumScore:
      candidate?.blockBelowMinimumScore === undefined
        ? DEFAULT_SETTINGS.blockBelowMinimumScore
        : Boolean(candidate.blockBelowMinimumScore),
    trustedHosts: normalizeHostList(candidate?.trustedHosts),
    scoreGateIgnoredHosts: normalizeHostList(candidate?.scoreGateIgnoredHosts),
  };
}

function normalizeMinimumScore(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_SETTINGS.minimumAllowedScore), 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_SETTINGS.minimumAllowedScore;
  }
  return Math.min(100, Math.max(0, parsed));
}

function normalizeHostList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => item.length > 0),
    ),
  ).slice(0, 50);
}

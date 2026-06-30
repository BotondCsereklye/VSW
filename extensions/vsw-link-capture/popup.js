const button = document.getElementById("scanCurrentPageButton");
const scanTargetButton = document.getElementById("scanTargetButton");
const statusElement = document.getElementById("status");
const liveCaptureToggle = document.getElementById("liveCaptureEnabled");
const blockOnFailureToggle = document.getElementById("blockOnScanFailure");
const minimumAllowedScoreInput = document.getElementById("minimumAllowedScore");
const blockBelowMinimumScoreToggle = document.getElementById("blockBelowMinimumScore");
const manualTargetInput = document.getElementById("manualTargetInput");
const DEFAULT_SETTINGS = {
  liveCaptureEnabled: true,
  blockOnScanFailure: true,
  minimumAllowedScore: 50,
  blockBelowMinimumScore: true,
};

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

manualTargetInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    scanTargetButton.click();
  }
});

liveCaptureToggle.addEventListener("change", () => {
  void persistSettings();
});

blockOnFailureToggle.addEventListener("change", () => {
  void persistSettings();
});

minimumAllowedScoreInput.addEventListener("change", () => {
  void persistSettings();
});

blockBelowMinimumScoreToggle.addEventListener("change", () => {
  void persistSettings();
});

async function init() {
  const result = await chrome.runtime.sendMessage({ type: "get-settings" });
  if (!result?.ok) {
    throw new Error(result?.error || "Could not load extension settings.");
  }

  const settings = normalizeSettings(result.settings);
  liveCaptureToggle.checked = settings.liveCaptureEnabled;
  blockOnFailureToggle.checked = settings.blockOnScanFailure;
  minimumAllowedScoreInput.value = String(settings.minimumAllowedScore);
  blockBelowMinimumScoreToggle.checked = settings.blockBelowMinimumScore;
  setStatus("Ready.", "ok");
}

async function persistSettings() {
  const settings = {
    liveCaptureEnabled: liveCaptureToggle.checked,
    blockOnScanFailure: blockOnFailureToggle.checked,
    minimumAllowedScore: normalizeMinimumScore(minimumAllowedScoreInput.value),
    blockBelowMinimumScore: blockBelowMinimumScoreToggle.checked,
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
  scanTargetButton.disabled = isBusy;
  manualTargetInput.disabled = isBusy;
  minimumAllowedScoreInput.disabled = isBusy;
  button.textContent = isBusy ? "Starting..." : "Scan current page";
  scanTargetButton.textContent = isBusy ? "Scanning..." : "Scan and visit target";
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
  };
}

function normalizeMinimumScore(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_SETTINGS.minimumAllowedScore), 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_SETTINGS.minimumAllowedScore;
  }
  return Math.min(100, Math.max(0, parsed));
}

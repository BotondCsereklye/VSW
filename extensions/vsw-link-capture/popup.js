const button = document.getElementById("scanCurrentPageButton");
const statusElement = document.getElementById("status");

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
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Failed to contact extension background: ${message}`, "error");
  } finally {
    setBusyState(false);
  }
});

function setStatus(message, state) {
  statusElement.textContent = message;
  statusElement.setAttribute("data-state", state);
}

function setBusyState(isBusy) {
  button.disabled = isBusy;
  button.textContent = isBusy ? "Starting..." : "Scan current page";
}

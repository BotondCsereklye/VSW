const VSW_EXTENSION_BRIDGE_SOURCE = "vsw-link-capture";

window.postMessage(
  {
    source: VSW_EXTENSION_BRIDGE_SOURCE,
    type: "vsw:bridge-ready",
  },
  window.location.origin,
);

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.data?.source !== "vsw-app") {
    return;
  }

  const requestId = event.data.requestId;
  if (!requestId) {
    return;
  }

  if (event.data.type === "vsw:get-extension-settings") {
    void forwardToRuntime(requestId, { type: "get-settings" });
    return;
  }

  if (event.data.type === "vsw:set-extension-settings") {
    void forwardToRuntime(requestId, {
      type: "set-settings",
      settings: event.data.settings || {},
    });
  }
});

async function forwardToRuntime(requestId, message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    window.postMessage(
      {
        source: VSW_EXTENSION_BRIDGE_SOURCE,
        requestId,
        response,
      },
      window.location.origin,
    );
  } catch (error) {
    window.postMessage(
      {
        source: VSW_EXTENSION_BRIDGE_SOURCE,
        requestId,
        response: {
          ok: false,
          error: normalizeError(error),
        },
      },
      window.location.origin,
    );
  }
}

function normalizeError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

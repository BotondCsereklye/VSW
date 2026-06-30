(function registerRuntimeFallback(root) {
  const api = {
    createRuntimeFallbackDecision,
  };

  root.VswRuntimeFallback = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);

function createRuntimeFallbackDecision(errorMessage) {
  const detail = String(errorMessage || "Extension runtime is unavailable.");
  return {
    continueNavigation: true,
    message: `Extension unavailable. Continuing navigation. ${detail}`,
  };
}

(function registerScoreGate(root) {
  const api = {
    evaluateGateDecision,
    getHostRule,
    matchesConfiguredHost,
    normalizeHostList,
    normalizeMinimumScore,
    normalizeSettings,
  };

  root.VswScoreGate = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);

function evaluateGateDecision(detail, settings) {
  if (!detail) {
    return {
      allowNavigation: !settings.blockOnScanFailure,
      message: settings.blockOnScanFailure
        ? "Navigation blocked because the scan result was not available."
        : "Scan result missing. Navigation continues.",
    };
  }

  if (detail.status === "failed") {
    return {
      allowNavigation: !settings.blockOnScanFailure,
      message: settings.blockOnScanFailure
        ? "Navigation blocked because the defensive scan failed."
        : "Defensive scan failed. Navigation continues.",
    };
  }

  const score = typeof detail.score === "number" ? detail.score : null;
  if (
    settings.blockBelowMinimumScore &&
    score !== null &&
    score < settings.minimumAllowedScore
  ) {
    return {
      allowNavigation: false,
      message: `Navigation blocked because the score ${score}/100 is below the minimum ${settings.minimumAllowedScore}/100.`,
    };
  }

  if (score !== null) {
    return {
      allowNavigation: true,
      message: `Defensive scan passed with score ${score}/100.`,
    };
  }

  return {
    allowNavigation: true,
    message: "Defensive scan finished without a numeric score.",
  };
}

function normalizeSettings(candidate, defaultSettings) {
  return {
    liveCaptureEnabled:
      candidate?.liveCaptureEnabled === undefined
        ? defaultSettings.liveCaptureEnabled
        : Boolean(candidate.liveCaptureEnabled),
    blockOnScanFailure:
      candidate?.blockOnScanFailure === undefined
        ? defaultSettings.blockOnScanFailure
        : Boolean(candidate.blockOnScanFailure),
    minimumAllowedScore: normalizeMinimumScore(
      candidate?.minimumAllowedScore,
      defaultSettings.minimumAllowedScore,
    ),
    blockBelowMinimumScore:
      candidate?.blockBelowMinimumScore === undefined
        ? defaultSettings.blockBelowMinimumScore
        : Boolean(candidate.blockBelowMinimumScore),
    trustedHosts: normalizeHostList(candidate?.trustedHosts),
    scoreGateIgnoredHosts: normalizeHostList(candidate?.scoreGateIgnoredHosts),
  };
}

function normalizeMinimumScore(value, defaultScore = 50) {
  const candidate = Number.parseInt(String(value ?? defaultScore), 10);
  if (Number.isNaN(candidate)) {
    return defaultScore;
  }
  return Math.min(100, Math.max(0, candidate));
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

function getHostRule(host, settings) {
  if (matchesConfiguredHost(host, settings.trustedHosts)) {
    return "trusted";
  }

  if (matchesConfiguredHost(host, settings.scoreGateIgnoredHosts)) {
    return "ignore-minimum-score";
  }

  return "default";
}

function matchesConfiguredHost(host, hostList) {
  const normalizedHost = String(host || "").trim().toLowerCase();
  if (!normalizedHost || !Array.isArray(hostList)) {
    return false;
  }

  return hostList.some((configuredHost) => {
    const normalizedConfiguredHost = String(configuredHost || "").trim().toLowerCase();
    return (
      normalizedHost === normalizedConfiguredHost ||
      normalizedHost.endsWith(`.${normalizedConfiguredHost}`)
    );
  });
}

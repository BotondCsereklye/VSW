const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluateGateDecision,
  getHostRule,
  matchesConfiguredHost,
  normalizeHostList,
  normalizeMinimumScore,
  normalizeSettings,
} = require("./score-gate.js");

const defaults = {
  liveCaptureEnabled: true,
  blockOnScanFailure: true,
  minimumAllowedScore: 50,
  blockBelowMinimumScore: true,
  trustedHosts: [],
  scoreGateIgnoredHosts: [],
};

test("normalizeMinimumScore clamps invalid values into the 0 to 100 range", () => {
  assert.equal(normalizeMinimumScore("-5"), 0);
  assert.equal(normalizeMinimumScore("101"), 100);
  assert.equal(normalizeMinimumScore("not-a-number"), 50);
  assert.equal(normalizeMinimumScore(75), 75);
});

test("normalizeSettings persists a configured minimum score", () => {
  const settings = normalizeSettings(
    {
      liveCaptureEnabled: false,
      blockOnScanFailure: false,
      minimumAllowedScore: "67",
      blockBelowMinimumScore: true,
    },
    defaults,
  );

  assert.deepEqual(settings, {
    liveCaptureEnabled: false,
    blockOnScanFailure: false,
    minimumAllowedScore: 67,
    blockBelowMinimumScore: true,
    trustedHosts: [],
    scoreGateIgnoredHosts: [],
  });
});

test("normalizeSettings migrates older partial storage safely", () => {
  const settings = normalizeSettings(
    {
      trustedHosts: ["https://www.GitHub.com/settings"],
    },
    defaults,
  );

  assert.deepEqual(settings, {
    liveCaptureEnabled: true,
    blockOnScanFailure: true,
    minimumAllowedScore: 50,
    blockBelowMinimumScore: true,
    trustedHosts: ["github.com"],
    scoreGateIgnoredHosts: [],
  });
});

test("normalizeHostList deduplicates and lowercases host rules", () => {
  assert.deepEqual(normalizeHostList([" GitHub.com ", "github.com", "", null]), [
    "github.com",
  ]);
});

test("matchesConfiguredHost supports exact hosts and subdomains", () => {
  assert.equal(matchesConfiguredHost("github.com", ["github.com"]), true);
  assert.equal(matchesConfiguredHost("www.github.com", ["github.com"]), true);
  assert.equal(matchesConfiguredHost("https://www.github.com/issues", ["github.com"]), true);
  assert.equal(matchesConfiguredHost("api.github.com", ["www.github.com"]), true);
  assert.equal(matchesConfiguredHost("badgithub.com", ["github.com"]), false);
});

test("getHostRule prioritizes trusted hosts before score-ignore hosts", () => {
  assert.equal(
    getHostRule("www.youtube.com", {
      ...defaults,
      trustedHosts: ["youtube.com"],
      scoreGateIgnoredHosts: ["youtube.com"],
    }),
    "trusted",
  );

  assert.equal(
    getHostRule("github.com", {
      ...defaults,
      scoreGateIgnoredHosts: ["github.com"],
    }),
    "ignore-minimum-score",
  );
});

test("evaluateGateDecision blocks navigation below the configured threshold", () => {
  const decision = evaluateGateDecision(
    { status: "completed", score: 20 },
    { ...defaults, minimumAllowedScore: 50 },
  );

  assert.equal(decision.allowNavigation, false);
  assert.match(decision.message, /20\/100/);
});

test("evaluateGateDecision allows navigation at or above the configured threshold", () => {
  const decision = evaluateGateDecision(
    { status: "completed", score: 75 },
    { ...defaults, minimumAllowedScore: 50 },
  );

  assert.equal(decision.allowNavigation, true);
  assert.match(decision.message, /75\/100/);
});

test("evaluateGateDecision respects scan failure blocking", () => {
  const decision = evaluateGateDecision({ status: "failed", score: null }, defaults);

  assert.equal(decision.allowNavigation, false);
  assert.match(decision.message, /scan failed/i);
});

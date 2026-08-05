const assert = require("node:assert/strict");
const test = require("node:test");

const { createRuntimeFallbackDecision } = require("./runtime-fallback.js");

test("createRuntimeFallbackDecision blocks navigation after runtime failure", () => {
  const decision = createRuntimeFallbackDecision("Extension context invalidated.");

  assert.equal(decision.continueNavigation, false);
  assert.match(decision.message, /navigation blocked/i);
  assert.match(decision.message, /context invalidated/i);
});

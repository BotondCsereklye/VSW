const assert = require("node:assert/strict");
const test = require("node:test");

const { createRuntimeFallbackDecision } = require("./runtime-fallback.js");

test("createRuntimeFallbackDecision continues navigation after runtime failure", () => {
  const decision = createRuntimeFallbackDecision("Extension context invalidated.");

  assert.equal(decision.continueNavigation, true);
  assert.match(decision.message, /continuing navigation/i);
  assert.match(decision.message, /context invalidated/i);
});

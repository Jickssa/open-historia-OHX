import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildExpansionState } from "./ohxExpansionEngine.js";

const runtimePath = join(dirname(fileURLToPath(import.meta.url)), "ohxExpansion.js");
const runtimeSource = readFileSync(runtimePath, "utf8");

test("OHX runtime is non-destructive and cannot import the canonical world writer", () => {
  assert.doesNotMatch(runtimeSource, /writeWorldState/);
  assert.doesNotMatch(runtimeSource, /interactiveOffer\s*:/);
  assert.match(runtimeSource, /readWorldState/);
  assert.match(runtimeSource, /createInteractive/);
});

test("OHX runtime isolates chat persistence and cleans up its listeners", () => {
  assert.match(runtimeSource, /key === \"chat\"\) return/);
  assert.match(runtimeSource, /oh:runtime-json-updated/);
  assert.match(runtimeSource, /oh:active-game-changed/);
  assert.match(runtimeSource, /removeEventListener\("oh:runtime-json-updated"/);
  assert.match(runtimeSource, /removeEventListener\("oh:active-game-changed"/);
  assert.match(runtimeSource, /BOOT_DELAY_MS = 1200/);
  assert.match(runtimeSource, /idleTimer = setTimeout/);
});

test("OHX engine output never persists a world mutation", () => {
  const world = { marker: "sentinel", relations: [], agreements: [], wars: [], projects: [], storylines: [] };
  const snapshot = JSON.stringify(world);
  const result = buildExpansionState({ world, events: [], game: { round: 1, gameDate: "2026-10-05", country: "France" }, previous: {} });
  assert.equal(JSON.stringify(world), snapshot);
  assert.equal(result.source, "derived-in-memory");
});

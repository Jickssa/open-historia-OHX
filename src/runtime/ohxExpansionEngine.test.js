import test from "node:test";
import assert from "node:assert/strict";
import { buildExpansionState, categoryScores, equivalentExpansionState, isCandidateEvent } from "./ohxExpansionEngine.js";

test("OHX engine handles malformed tag fields without throwing", () => {
  const scores = categoryScores({ title: "Supply chain", description: "medical procurement", tags: "health" });
  assert.equal(typeof scores.health, "number");
  assert.equal(typeof scores.logistics, "number");
});

test("OHX engine rejects empty or malformed event candidates", () => {
  assert.equal(isCandidateEvent(null), false);
  assert.equal(isCandidateEvent({ id: "", title: "x", description: "y" }), false);
  assert.equal(isCandidateEvent({ id: "e1", title: "x", description: "y", importance: "major" }), true);
});

test("OHX metrics history is bounded and does not duplicate the current round/date", () => {
  const world = { relations: [], agreements: [], wars: [], projects: [], storylines: [] };
  const game = { round: 3, gameDate: "2026-10-05", country: "France" };
  const previous = { metricsHistory: [{ round: 3, date: "2026-10-05", old: true }], playedMomentIds: ["a"] };
  const state = buildExpansionState({ world, events: [], game, previous });
  assert.equal(state.metricsHistory.length, 1);
  assert.equal(state.playedMomentIds.includes("a"), true);
  assert.equal(state.version, 3);
});

test("OHX state is deterministic for identical inputs", () => {
  const world = { relations: [], agreements: [], wars: [], projects: [], storylines: [] };
  const events = [{ id: "e1", title: "Market briefing", description: "trade and medicine", importance: "major", notable: true, playerRelated: true }];
  const game = { round: 1, gameDate: "2026-10-05", country: "France" };
  const a = buildExpansionState({ world, events, game, previous: {} });
  const b = buildExpansionState({ world, events, game, previous: {} });
  assert.equal(equivalentExpansionState(a, b), true);
});

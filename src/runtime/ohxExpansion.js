/*! Open Historia — OHX Expansion Runtime v3.0.1. Passive, race-safe, non-destructive. */

import { readEventsState, readGameData, readWorldState } from "./gameState.js";
import { buildExpansionState } from "./ohxExpansionEngine.js";
import { OHXSituationRoom } from "./ohxExpansionUI.js";

const BOOT_DELAY_MS = 1200;
const REFRESH_DEBOUNCE_MS = 120;
const STORAGE_KEY = "ohx-v3.0.1-played-moments";

let booted = false;
let destroyed = false;
let refreshTimer = null;
let idleTimer = null;
let refreshSerial = 0;
let state = null;
let latestWorld = null;
let latestEvents = null;
let latestGame = null;
let situationRoom = null;

const text = (value) => String(value ?? "").trim();
const array = (value) => (Array.isArray(value) ? value : []);
const activeWorldOf = (event) => event?.detail?.world && typeof event.detail.world === "object" ? event.detail.world : null;
const activeGameOf = (event) => event?.detail?.game && typeof event.detail.game === "object" ? event.detail.game : null;

const safeStorage = () => {
  try { return window.localStorage; } catch { return null; }
};

const playedScope = (game) => {
  const country = text(game?.country).toLowerCase();
  const start = text(game?.startDate || game?.gameDate);
  return `${country}|${start}`;
};

const readPlayed = (game) => {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
    const value = raw?.[playedScope(game)];
    return array(value).map(text).filter(Boolean).slice(-280);
  } catch { return []; }
};

const writePlayed = (game, values) => {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
    raw[playedScope(game)] = [...new Set(array(values).map(text).filter(Boolean))].slice(-280);
    storage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch { /* storage is optional */ }
};

const currentInputsComplete = () => latestWorld && latestEvents && latestGame;

const rebuild = () => {
  if (destroyed || !currentInputsComplete()) return;
  const previous = state || {};
  state = buildExpansionState({
    world: latestWorld,
    events: latestEvents,
    game: latestGame,
    previous: {
      playedMomentIds: readPlayed(latestGame),
      metricsHistory: previous?.metricsHistory || [],
    },
  });
  situationRoom?.setState(state);
};

const readInitial = async () => {
  const serial = ++refreshSerial;
  try {
    const [world, events, game] = await Promise.all([
      readWorldState({ force: true }),
      readEventsState({ force: true }),
      readGameData({ force: true }),
    ]);
    if (destroyed || serial !== refreshSerial) return;
    latestWorld = world;
    latestEvents = events;
    latestGame = game;
    rebuild();
  } catch (error) {
    console.warn("[OHX] initial diagnostics refresh failed", error);
    situationRoom?.setError("Impossible de charger l’état OHX. Le jeu principal reste intact.");
  }
};

const schedule = () => {
  if (destroyed) return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    rebuild();
    if (!currentInputsComplete()) void readInitial();
  }, REFRESH_DEBOUNCE_MS);
};

const handleWorldUpdate = (event) => {
  const world = activeWorldOf(event);
  if (world) { latestWorld = world; rebuild(); }
};

const handleGameUpdate = (event) => {
  const game = activeGameOf(event);
  if (game) { latestGame = game; rebuild(); }
};

const handleRuntimeJsonUpdate = (event) => {
  const key = text(event?.detail?.key).toLowerCase();
  const value = event?.detail?.value;
  if (key === "world" && value && typeof value === "object") { latestWorld = value; rebuild(); return; }
  if (key === "events" && Array.isArray(value)) { latestEvents = value; rebuild(); return; }
  if (key === "game" && value && typeof value === "object") { latestGame = value; rebuild(); return; }
  if (key === "chat") return; // Chat writes must never trigger world writes or expensive reads.
};

const handleCampaignSwitch = () => {
  latestWorld = null;
  latestEvents = null;
  latestGame = null;
  state = null;
  situationRoom?.setState(null);
  schedule();
};

const playMoment = async (eventId) => {
  const id = text(eventId);
  if (!id || !latestWorld || !latestGame) throw new Error("OHX : état de campagne indisponible.");
  if (latestWorld?.activeInteractive) throw new Error("Une scène interactive est déjà en cours.");
  const officialOffer = text(latestWorld?.interactiveOffer?.eventId);
  if (officialOffer !== id) {
    throw new Error("Ce moment n’est pas actuellement offert par le moteur interactif natif.");
  }

  const { createInteractive } = await import("../Game/AI/gameplayLazy.js");
  await createInteractive({ eventId: id });
  writePlayed(latestGame, [...readPlayed(latestGame), id]);
  window.dispatchEvent(new Event("oh:open-interactive-event"));
  schedule();
};

export const getOHXState = () => state;

export const resetOHXForTests = () => {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (idleTimer) clearTimeout(idleTimer);
  refreshTimer = null;
  idleTimer = null;
  refreshSerial += 1;
  destroyed = false;
  latestWorld = null;
  latestEvents = null;
  latestGame = null;
  state = null;
  if (situationRoom) situationRoom.destroy();
  situationRoom = null;
  booted = false;
};

export const bootOHXExpansion = () => {
  if (booted || typeof window === "undefined" || typeof document === "undefined") return;
  booted = true;
  destroyed = false;
  situationRoom = new OHXSituationRoom({
    getState: () => state,
    onPlayMoment: playMoment,
  });
  window.addEventListener("oh:world-updated", handleWorldUpdate);
  window.addEventListener("oh:game-updated", handleGameUpdate);
  window.addEventListener("oh:runtime-json-updated", handleRuntimeJsonUpdate);
  window.addEventListener("oh:active-game-changed", handleCampaignSwitch);

  // Never compete with first paint, map construction, or the first interactive input.
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (!destroyed) void readInitial();
  }, BOOT_DELAY_MS);
};

export const destroyOHXExpansion = () => {
  if (!booted) return;
  destroyed = true;
  if (refreshTimer) clearTimeout(refreshTimer);
  if (idleTimer) clearTimeout(idleTimer);
  refreshTimer = null;
  idleTimer = null;
  window.removeEventListener("oh:world-updated", handleWorldUpdate);
  window.removeEventListener("oh:game-updated", handleGameUpdate);
  window.removeEventListener("oh:runtime-json-updated", handleRuntimeJsonUpdate);
  window.removeEventListener("oh:active-game-changed", handleCampaignSwitch);
  situationRoom?.destroy();
  situationRoom = null;
  state = null;
  latestWorld = null;
  latestEvents = null;
  latestGame = null;
  booted = false;
};

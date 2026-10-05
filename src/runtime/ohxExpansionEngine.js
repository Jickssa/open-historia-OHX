/*! Open Historia — OHX Expansion Engine v3.0.1. Pure, deterministic, non-persistent. */

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const array = (value) => (Array.isArray(value) ? value : []);
const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, finite(value, min)));
const lower = (value) => clean(value).toLowerCase();
const unique = (values) => [...new Set(array(values).map(clean).filter(Boolean))];

const IMPORTANCE = Object.freeze({ critical: 5, high: 4, major: 3, moderate: 2, minor: 1 });

const KEYWORDS = Object.freeze({
  market: ["market", "commerce", "trade", "finance", "bank", "currency", "sanction", "tariff", "price", "marché", "commerce", "finance", "banque", "devise", "sanction", "douane", "prix"],
  health: ["health", "hospital", "medicine", "medical", "public health", "healthcare", "santé", "hôpital", "médicament", "médical", "soins", "pharma", "overdose", "pain", "palliative", "treatment"],
  logistics: ["port", "shipping", "supply", "logistics", "warehouse", "transport", "cargo", "container", "chaîne", "approvisionnement", "logistique", "entrepôt", "transport", "fret", "traceability", "procurement"],
  diplomacy: ["summit", "treaty", "agreement", "negotiation", "ambassador", "diplomatic", "sanction", "sommet", "traité", "accord", "négociation", "ambassadeur", "diplomatique", "coalition"],
  security: ["security", "police", "customs", "intelligence", "spy", "arrest", "investigation", "sécurité", "police", "douane", "renseignement", "espion", "enquête", "arrestation", "money laundering", "corruption"],
  society: ["protest", "election", "public opinion", "media", "demonstration", "protestation", "opinion publique", "média", "manifestation", "grève", "strike", "rights", "privacy"],
  technology: ["digital", "cyber", "software", "platform", "algorithm", "AI", "numérique", "cyber", "plateforme", "algorithme", "technologie", "traceability", "data"],
  regulation: ["regulation", "licence", "licensing", "compliance", "law", "legal", "régulation", "licence", "conformité", "droit", "contrôle", "prescription"],
  corruption: ["corruption", "bribe", "procurement fraud", "kickback", "conflit d'intérêts", "corruption", "favoritisme", "détournement", "lobbying"],
});

const REASONS = Object.freeze({
  market: "Marchés, commerce et prix",
  health: "Santé publique et accès médical",
  logistics: "Chaînes d'approvisionnement et traçabilité",
  diplomacy: "Diplomatie, coalitions et accords",
  security: "Sécurité, douanes et renseignement",
  society: "Société, droits et opinion publique",
  technology: "Technologie, données et information",
  regulation: "Régulation, conformité et droit",
  corruption: "Intégrité publique et gouvernance",
  general: "Moment stratégique",
});

const textOfEvent = (event) => {
  const tags = Array.isArray(event?.tags) ? event.tags : (event?.tags ? [event.tags] : []);
  return [event?.title, event?.description, ...tags].map(clean).filter(Boolean).join(" ");
};

const countKeywordHits = (text, words) => {
  const hay = lower(text);
  return array(words).reduce((sum, word) => {
    const needle = lower(word);
    return needle && hay.includes(needle) ? sum + 1 : sum;
  }, 0);
};

export const categoryScores = (event) => {
  const text = textOfEvent(event);
  return Object.fromEntries(Object.entries(KEYWORDS).map(([key, words]) => [key, countKeywordHits(text, words)]));
};

export const categoryOf = (event) => {
  const scores = categoryScores(event);
  return Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[1] > 0
    ? Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
    : "general";
};

const importanceOf = (event) => IMPORTANCE[lower(event?.importance)] || (event?.notable === true ? 2 : 1);

const eventIsValid = (event) => Boolean(
  event && typeof event === "object" &&
  clean(event.id) && clean(event.title) && clean(event.description),
);

export const isCandidateEvent = (event) => {
  if (!eventIsValid(event)) return false;
  const kind = lower(event.kind);
  const source = lower(event.source);
  if (kind === "interactive" || ["fallback", "espionage"].includes(source)) return false;
  return event.playerRelated === true || event.notable === true || importanceOf(event) >= 3;
};

const historyEventIds = (world) => {
  const ids = new Set();
  for (const entry of array(world?.simulationHistory).slice(0, 4)) {
    for (const id of array(entry?.eventIds)) if (clean(id)) ids.add(clean(id));
  }
  return ids;
};

export const pickRecentEvents = ({ world, events }) => {
  const all = array(events).filter(eventIsValid);
  if (!all.length) return [];
  const ids = historyEventIds(world);
  const head = all.filter((event) => ids.has(clean(event.id)));
  if (head.length) return head.slice(-24);
  return all.slice(-24);
};

const average = (values, fallback = 50) => {
  const nums = array(values).map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : fallback;
};

const caseInsensitiveLookup = (record, name, fallback = 50) => {
  if (!record || typeof record !== "object") return fallback;
  const wanted = lower(name);
  const key = Object.keys(record).find((candidate) => lower(candidate) === wanted);
  return key ? finite(record[key], fallback) : fallback;
};

const activeAgreementPressure = (agreements) => array(agreements).filter((a) => ["active", "suspended"].includes(lower(a?.status))).length;
const activeWarPressure = (wars) => array(wars).filter((w) => lower(w?.status) === "active").length;
const activeProjectsPressure = (projects) => array(projects).filter((p) => ["active", "delayed", "stalled"].includes(lower(p?.status))).length;

export const topCountryNames = (world, playerName = "") => {
  const seen = new Map();
  const add = (name, weight = 1) => {
    const n = clean(name);
    if (!n) return;
    const key = lower(n);
    const current = seen.get(key);
    seen.set(key, { name: current?.name || n, weight: (current?.weight || 0) + weight });
  };
  add(playerName, 8);
  for (const r of array(world?.relations)) { add(r?.a, 2); add(r?.b, 2); }

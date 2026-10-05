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
  for (const a of array(world?.agreements)) for (const p of array(a?.parties)) add(p, 1.25);
  for (const w of array(world?.wars)) for (const p of [...array(w?.sideA), ...array(w?.sideB)]) add(p, 3);
  return [...seen.values()].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name)).slice(0, 24).map((entry) => entry.name);
};

export const deriveDynamics = ({ world, events }) => {
  const recent = pickRecentEvents({ world, events });
  const categoryTotals = Object.fromEntries(Object.keys(KEYWORDS).map((key) => [key, 0]));
  let eventPressure = 0;
  for (const event of recent) {
    const weight = importanceOf(event);
    eventPressure += weight;
    const scores = categoryScores(event);
    for (const [key, hits] of Object.entries(scores)) categoryTotals[key] += hits * weight;
  }

  const activeStorylines = array(world?.storylines).filter((s) => ["active", "dormant", "escalating"].includes(lower(s?.status)));
  const storylinePressure = average(activeStorylines.map((s) => finite(s?.pressure)), 35);
  const storylineMomentum = average(activeStorylines.map((s) => finite(s?.momentum)), 30);
  const relationHeat = array(world?.relations).filter((r) => ["hostile", "rival", "strained"].includes(lower(r?.status))).length;
  const diplomacyBase = activeWarPressure(world?.wars) * 10 + relationHeat * 2 + activeAgreementPressure(world?.agreements) * 0.5;
  const projectLoad = activeProjectsPressure(world?.projects) * 3;
  const reportLoad = Math.min(50, array(world?.reports).length * 0.75);
  const spyLoad = Math.min(50, array(world?.spies).filter((s) => lower(s?.status) === "active").length * 4);

  const marketStress = clamp(25 + categoryTotals.market * 4.5 + categoryTotals.logistics * 2.3 + projectLoad * 0.8 + categoryTotals.corruption * 0.9);
  const healthPressure = clamp(18 + categoryTotals.health * 5.4 + categoryTotals.logistics * 1.1 + eventPressure * 0.25);
  const logisticsStrain = clamp(18 + categoryTotals.logistics * 6.2 + projectLoad + categoryTotals.market * 1.3);
  const informationNoise = clamp(12 + categoryTotals.technology * 5.5 + reportLoad + spyLoad + recent.length * 1.4);
  const diplomaticHeat = clamp(14 + diplomacyBase + categoryTotals.diplomacy * 3.8 + categoryTotals.regulation * 0.8);
  const systemicRisk = clamp(0.25 * storylinePressure + 0.2 * storylineMomentum + 0.2 * marketStress + 0.15 * healthPressure + 0.2 * diplomaticHeat + categoryTotals.corruption * 1.2);
  const resilience = clamp(100 - (0.34 * logisticsStrain + 0.22 * marketStress + 0.17 * healthPressure + 0.15 * systemicRisk + 0.12 * informationNoise));
  const reputationAverage = average(Object.values(world?.internationalReputation || {}).map(Number), 55);
  const regulatoryCapacity = clamp(35 + categoryTotals.regulation * 4 - categoryTotals.corruption * 1.5 + reputationAverage * 0.2);

  return {
    marketStress: Math.round(marketStress),
    healthPressure: Math.round(healthPressure),
    logisticsStrain: Math.round(logisticsStrain),
    informationNoise: Math.round(informationNoise),
    diplomaticHeat: Math.round(diplomaticHeat),
    systemicRisk: Math.round(systemicRisk),
    resilience: Math.round(resilience),
    institutionalTrust: Math.round(clamp(reputationAverage)),
    regulatoryCapacity: Math.round(regulatoryCapacity),
    pressure: Math.round(clamp(eventPressure * 3.5 + systemicRisk * 0.4)),
    categories: Object.fromEntries(Object.entries(categoryTotals).map(([k, v]) => [k, Math.round(v)])),
    sampleSize: recent.length,
  };
};

export const deriveCrises = ({ world, events, dynamics }) => {
  const recent = pickRecentEvents({ world, events });
  return recent
    .filter(isCandidateEvent)
    .sort((a, b) => importanceOf(b) - importanceOf(a) || String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 10)
    .map((event) => {
      const category = categoryOf(event);
      const severity = clamp(importanceOf(event) * 16 + (event.notable ? 10 : 0) + dynamics.systemicRisk * 0.22 + dynamics.pressure * 0.12 + (dynamics.categories?.corruption || 0) * 0.8);
      return {
        id: `crisis-${clean(event.id)}`,
        eventId: clean(event.id),
        title: clean(event.title),
        category,
        severity: Math.round(severity),
        status: severity >= 72 ? "critical" : severity >= 50 ? "active" : "watch",
        date: clean(event.date),
        description: clean(event.description).slice(0, 360),
      };
    });
};

export const deriveActors = ({ world, dynamics, playerName = "" }) => {
  return topCountryNames(world, playerName).map((name) => {
    const relations = array(world?.relations).filter((r) => lower(r?.a) === lower(name) || lower(r?.b) === lower(name));
    const reputation = caseInsensitiveLookup(world?.internationalReputation, name, 50);
    const hostile = relations.filter((r) => ["hostile", "rival", "strained"].includes(lower(r?.status))).length;
    const friendly = relations.filter((r) => ["friendly", "cordial", "allied"].includes(lower(r?.status))).length;
    const influence = clamp(42 + Math.abs(average(relations.map((r) => finite(r?.score)), 0)) * 0.2 + reputation * 0.25 + friendly * 4 - hostile * 5);
    const pressure = clamp(22 + dynamics.diplomaticHeat * 0.42 + hostile * 9 + Math.max(0, 55 - reputation) * 0.38);
    return {
      name,
      influence: Math.round(influence),
      pressure: Math.round(pressure),
      reputation: Math.round(clamp(reputation)),
      hostile,
      friendly,
    };
  }).sort((a, b) => b.influence - a.influence || a.name.localeCompare(b.name)).slice(0, 16);
};

export const deriveStorylines = ({ world }) => array(world?.storylines)
  .filter((s) => ["active", "dormant", "escalating"].includes(lower(s?.status)))
  .slice()
  .sort((a, b) => (finite(b?.pressure) + finite(b?.momentum) * 0.7) - (finite(a?.pressure) + finite(a?.momentum) * 0.7))
  .slice(0, 24)
  .map((s) => ({
    id: clean(s?.id),
    title: clean(s?.title) || "Persistent thread",
    kind: clean(s?.kind) || "world",
    status: lower(s?.status) || "active",
    pressure: Math.round(clamp(s?.pressure)),
    momentum: Math.round(clamp(s?.momentum)),
    nextReviewDate: clean(s?.nextReviewDate),
    state: clean(s?.state).slice(0, 340),
    participants: unique(s?.participants).slice(0, 8),
  }));

export const deriveCommitments = ({ world }) => array(world?.agreements)
  .filter((a) => ["active", "suspended", "pending", "under_review"].includes(lower(a?.status)))
  .slice()
  .sort((a, b) => String(a?.status).localeCompare(String(b?.status)) || String(a?.title).localeCompare(String(b?.title)))
  .slice(0, 24)
  .map((a) => ({
    id: clean(a?.id),
    title: clean(a?.title) || "Unnamed agreement",
    type: clean(a?.type) || "other",
    status: lower(a?.status) || "active",
    parties: unique(a?.parties).slice(0, 8),

/*! Open Historia — OHX Situation Room UI v3.0.1. */

const array = (value) => (Array.isArray(value) ? value : []);
const text = (value) => String(value ?? "");
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const CSS = `
:host{all:initial;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f4f4f5}
*{box-sizing:border-box}button{font:inherit}
#root{position:fixed;right:12px;bottom:12px;z-index:10030}
#launch{min-width:48px;height:44px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(18,18,22,.96);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.34);cursor:pointer;font-weight:800}
#panel{display:none;position:absolute;right:0;bottom:52px;width:min(450px,calc(100vw - 20px));max-height:min(78vh,700px);overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:#101114;box-shadow:0 18px 55px rgba(0,0,0,.48)}
#panel.open{display:flex;flex-direction:column}
#head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
.title{font-size:14px;font-weight:850}.sub{font-size:10px;color:rgba(255,255,255,.5);margin-top:2px}
#tabs{display:flex;gap:6px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);overflow:auto}.tab{border:1px solid rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.65);border-radius:9px;padding:7px 9px;font-size:10px;cursor:pointer;white-space:nowrap}.tab.active{background:rgba(96,165,250,.16);border-color:rgba(96,165,250,.35);color:#dbeafe}
#body{overflow:auto;padding:12px;overscroll-behavior:contain}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.card,.row{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:12px;padding:10px}.k{font-size:9px;color:rgba(255,255,255,.48);text-transform:uppercase;letter-spacing:.06em}.v{font-size:17px;font-weight:850;margin-top:2px}.meter{height:5px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;margin-top:7px}.meter>i{display:block;height:100%;background:#8ab4ff;border-radius:inherit}.section{font-size:10px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.5);margin:14px 0 7px}.list{display:flex;flex-direction:column;gap:7px}.rowtop{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.name{font-size:12px;font-weight:750}.meta{font-size:9px;color:rgba(255,255,255,.44);margin-top:2px}.desc{font-size:10px;line-height:1.45;color:rgba(255,255,255,.68);margin-top:6px}.pill{font-size:8px;font-weight:750;border-radius:999px;padding:3px 6px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.72);white-space:nowrap}.action{border:1px solid rgba(96,165,250,.35);background:rgba(96,165,250,.12);color:#dbeafe;border-radius:8px;padding:6px 8px;font-size:9px;font-weight:800;cursor:pointer}.action:disabled{opacity:.45;cursor:default}.empty{font-size:10px;line-height:1.5;color:rgba(255,255,255,.46);padding:12px 2px}.error{border:1px solid rgba(248,113,113,.35);background:rgba(127,29,29,.2);color:#fecaca;border-radius:10px;padding:8px;font-size:10px;margin:0 0 9px}.details{position:absolute;inset:0;background:#101114;padding:14px;overflow:auto}.close{border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.7);border-radius:8px;padding:5px 8px;font-size:10px;cursor:pointer}
@media(max-width:520px){#root{right:8px;bottom:8px}#panel{width:calc(100vw - 16px);max-height:82vh}.grid{grid-template-columns:1fr 1fr}}
`;

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "className") node.className = value;
    else if (key === "onClick") node.addEventListener("click", value);
    else if (key === "disabled") node.disabled = Boolean(value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) node.append(child);
  return node;
};

export class OHXSituationRoom {
  constructor({ getState, onPlayMoment }) {
    this.getState = getState;
    this.onPlayMoment = onPlayMoment;
    this.tab = "overview";
    this.detail = null;
    this.error = "";
    this.busy = new Set();
    this.host = document.createElement("div");
    this.shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    this.shadow.append(style);
    this.root = el("div", { id: "root" });
    this.launch = el("button", { id: "launch", type: "button", title: "Open Historia Situation Room", text: "Situation", onClick: () => this.toggle() });
    this.panel = el("section", { id: "panel", role: "dialog", "aria-label": "OHX Situation Room" });
    this.root.append(this.panel, this.launch);
    this.shadow.append(this.root);
    document.body.append(this.host);
    this.keydown = (event) => { if (event.key === "Escape" && this.panel.classList.contains("open")) this.close(); };
    window.addEventListener("keydown", this.keydown);
    this.render();
  }

  toggle() { this.panel.classList.contains("open") ? this.close() : this.open(); }
  open() { this.panel.classList.add("open"); this.render(); }
  close() { this.panel.classList.remove("open"); this.detail = null; this.render(); }
  setState(state) { if (state !== undefined) this._state = state; if (this.panel.classList.contains("open")) this.render(); }
  setError(message) { this.error = text(message); if (this.panel.classList.contains("open")) this.render(); }
  get state() { return this._state ?? this.getState?.() ?? null; }

  header(state) {
    const box = el("div", { id: "head" });
    box.append(
      el("div", {}, [el("div", { className: "title", text: "OHX · SITUATION ROOM" }), el("div", { className: "sub", text: `${text(state?.gameDate || "—")} · tour ${text(state?.round || "—")}` })]),
      el("button", { className: "close", type: "button", text: "Fermer", onClick: () => this.close() }),
    );
    return box;
  }

  tabs() {
    const wrap = el("div", { id: "tabs" });
    for (const [id, label] of [["overview", "Vue"], ["moments", "Moments"], ["crises", "Crises"], ["threads", "Fils"], ["actors", "Acteurs"]]) {
      wrap.append(el("button", { className: `tab${this.tab === id ? " active" : ""}`, type: "button", text: label, onClick: () => { this.tab = id; this.detail = null; this.error = ""; this.render(); } }));
    }
    return wrap;
  }

  overview(state) {
    const metrics = state?.metrics || {};
    const body = el("div");
    const grid = el("div", { className: "grid" });
    const pairs = [["Risque systémique", metrics.systemicRisk], ["Tension diplomatique", metrics.diplomaticHeat], ["Stress des marchés", metrics.marketStress], ["Pression sanitaire", metrics.healthPressure], ["Logistique", metrics.logisticsStrain], ["Bruit informationnel", metrics.informationNoise], ["Capacité réglementaire", metrics.regulatoryCapacity], ["Résilience", metrics.resilience]];
    for (const [label, value] of pairs) {
      const card = el("div", { className: "card" });
      card.append(el("div", { className: "k", text: label }), el("div", { className: "v", text: `${Math.round(value || 0)}/100` }));
      const meter = el("div", { className: "meter" }); meter.append(el("i", { style: `width:${clamp(value)}%` })); card.append(meter); grid.append(card);
    }    body.append(grid);
    body.append(el("div", { className: "section", text: "Signaux dominants" }));
    const list = el("div", { className: "list" });
    for (const crisis of array(state?.crises).slice(0, 5)) {
      list.append(el("div", { className: "row", onClick: () => { this.detail = crisis; this.render(); } }, [el("div", { className: "rowtop" }, [el("div", { className: "name", text: crisis.title }), el("span", { className: "pill", text: `${crisis.status} · ${crisis.severity}` })]), el("div", { className: "meta", text: `${crisis.date || ""} · ${crisis.category}` })]));
    }
    if (!list.childElementCount) list.append(el("div", { className: "empty", text: "Aucun signal saillant sur l'état actuellement visible." }));
    body.append(list); return body;
  }

  moments(state) {
    const body = el("div");
    body.append(el("div", { className: "section", text: "Moments supplémentaires sûrs" }));
    body.append(el("div", { className: "empty", text: "Le bouton Jouer est activé uniquement quand le moteur interactif natif offre réellement l'événement. OHX ne fabrique plus d'offre artificielle et ne modifie jamais world.json pour forcer une scène." }));
    const list = el("div", { className: "list" });
    for (const offer of array(state?.interactiveDeck?.offers)) {
      const row = el("div", { className: "row" });
      const top = el("div", { className: "rowtop" });
      const left = el("div", {}, [el("div", { className: "name", text: offer.title }), el("div", { className: "meta", text: `${offer.date || ""} · ${offer.reason}` })]);
      const button = el("button", { className: "action", type: "button", text: offer.officialPlayable ? "Jouer" : "Détails" });
      button.onclick = async () => {
        if (!offer.officialPlayable) { this.detail = offer; this.render(); return; }
        if (this.busy.has(offer.eventId)) return;
        this.busy.add(offer.eventId); this.error = ""; button.disabled = true;
        try { await this.onPlayMoment(offer.eventId); }
        catch (error) { this.error = error?.message || "Impossible d'ouvrir la scène."; }
        finally { this.busy.delete(offer.eventId); button.disabled = false; this.render(); }
      };
      top.append(left, button); row.append(top); list.append(row);
    }
    if (!list.childElementCount) list.append(el("div", { className: "empty", text: "Aucun candidat récent. Le deck se renouvelle avec les événements du moteur." }));
    body.append(list); return body;
  }

  listTab(items, title, detailTransform) {
    const body = el("div"); body.append(el("div", { className: "section", text: title }));
    const list = el("div", { className: "list" });
    for (const item of array(items)) list.append(el("div", { className: "row", onClick: () => { this.detail = detailTransform(item); this.render(); } }, [el("div", { className: "name", text: item.title || item.name || item.id }), el("div", { className: "meta", text: item.status || item.category || item.type || "" })]));
    if (!list.childElementCount) list.append(el("div", { className: "empty", text: "Aucune entrée." }));
    body.append(list); return body;
  }

  detailView(detail) {
    const body = el("div", { className: "details" });
    body.append(el("div", { className: "rowtop" }, [el("div", { className: "name", text: detail?.title || detail?.name || detail?.id || "Détail" }), el("button", { className: "close", type: "button", text: "Retour", onClick: () => { this.detail = null; this.render(); } })]));
    for (const [key, value] of Object.entries(detail || {})) {
      if (key === "title" || key === "name") continue;
      const line = el("div", { className: "row", style: "margin-top:8px" });
      line.append(el("div", { className: "k", text: key }), el("div", { className: "desc", text: typeof value === "string" ? value : JSON.stringify(value) })); body.append(line);
    }
    return body;
  }

  body(state) {
    if (this.detail) return this.detailView(this.detail);
    if (this.tab === "moments") return this.moments(state);
    if (this.tab === "crises") return this.listTab(state?.crises, "Crises", (item) => item);
    if (this.tab === "threads") return this.listTab(state?.storylines, "Fils actifs", (item) => item);
    if (this.tab === "actors") return this.listTab(state?.actors, "Acteurs", (item) => item);
    return this.overview(state);
  }

  render() {
    if (!this.panel) return;
    const state = this.state;
    this.panel.replaceChildren(this.header(state || {}), this.tabs());
    const body = el("div", { id: "body" });
    if (this.error) body.append(el("div", { className: "error", role: "alert", text: this.error }));
    if (!state) body.append(el("div", { className: "empty", text: "Chargement différé du module OHX… Le jeu principal reste disponible immédiatement." }));
    else body.append(this.body(state));
    this.panel.append(body);
  }

  destroy() {
    window.removeEventListener("keydown", this.keydown);
    this.host.remove();
    this.getState = null;
    this.onPlayMoment = null;
  }
}

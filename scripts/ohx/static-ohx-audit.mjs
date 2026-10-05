#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const runtime = readFileSync(join(root, "src/runtime/ohxExpansion.js"), "utf8");
const engine = readFileSync(join(root, "src/runtime/ohxExpansionEngine.js"), "utf8");
const ui = readFileSync(join(root, "src/runtime/ohxExpansionUI.js"), "utf8");
const main = readFileSync(join(root, "src/main.jsx"), "utf8");
const checks = [];
const check = (name, ok) => {
  checks.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};
check("OHX runtime never imports writeWorldState", !/writeWorldState/.test(runtime));
check("OHX runtime never fabricates interactiveOffer", !/interactiveOffer\s*:/.test(runtime));
check("OHX runtime gates playback on native interactiveOffer", /latestWorld\?\.interactiveOffer\?\.eventId/.test(runtime));
check("OHX runtime listens for canonical world/game events", /oh:world-updated/.test(runtime) && /oh:game-updated/.test(runtime));
check("OHX runtime ignores chat writes", /key === "chat"\) return/.test(runtime));
check("OHX runtime cleans all installed listeners", /removeEventListener\("oh:world-updated"/.test(runtime) && /removeEventListener\("oh:active-game-changed"/.test(runtime));
check("OHX boot is deferred by 1200 ms", /window\.setTimeout\(\(\) => bootOHXExpansion\(\), 1200\)/.test(main));
check("OHX UI has no extreme legacy z-index", !/2147483/.test(ui));
check("OHX UI surfaces runtime errors accessibly", /role: \"alert\"/.test(ui));
check("OHX engine is non-persistent", !/localStorage|writeWorldState|fetch(/.test(engine));
check("Runtime test exists", existsSync(join(root, "src/runtime/ohxExpansion.test.js")));
check("Engine test exists", existsSync(join(root, "src/runtime/ohxExpansionEngine.test.js")));
if (!checks.every(Boolean)) process.exit(1);
console.log(`\\n${checks.filter(Boolean).length}/${checks.length} static OHX checks passed.`);

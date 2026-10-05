#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const files = {
  chat: join(root, "src/Game/GameUI/chat.jsx"),
  advisor: join(root, "src/Game/GameUI/advisor.jsx"),
  ai: join(root, "src/Game/AI/main.jsx"),
  state: join(root, "src/runtime/gameState.js"),
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, readFileSync(file, "utf8")]));
const checks = [];
const check = (name, condition) => {
  checks.push(Boolean(condition));
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
};
check("Diplomatie has a player input composer", /Send a diplomatic message|playerInput/.test(source.chat));
check("Diplomatie has request bridge", /requestDiplomaticChat/.test(source.chat));
check("Diplomatie sends through native sendDiplomaticMessage", /sendDiplomaticMessage/.test(source.chat));
check("Diplomatie persists/handles failure explicitly", /fetchLeaderResponse|error/i.test(source.chat));
check("Conseiller has native handleSend path", /handleSend/.test(source.advisor));
check("Conseiller drafts open native diplomacy composer", /requestDiplomaticChat/.test(source.advisor));
check("AI main exposes sendDiplomaticMessage", /export async function sendDiplomaticMessage/.test(source.ai));
check("AI main exposes once-off diplomatic send", /sendDiplomaticMessageOnceOff/.test(source.ai));
check("Chat state is separate from world state", /writeChatsState/.test(source.state));
check("OHX is not imported into chat.jsx/advisor.jsx", !/ohxExpansion/.test(source.chat) && !/ohxExpansion/.test(source.advisor));
if (!checks.every(Boolean)) process.exit(1);
console.log(`\\n${checks.length}/${checks.length} core chat/advisor checks passed.`);

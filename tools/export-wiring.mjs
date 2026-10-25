// SPDX-License-Identifier: MIT
// Write examples/NN-…/wiring.svg (and capstone/turnlight/wiring-*.svg) from site/assets/js/data/wiring.js with the pinout engine itself,
// so wiring diagrams never disagree with the pin data (PLAN.md §5.1, §9.2).
//   node tools/export-wiring.mjs           # regenerate
//   node tools/export-wiring.mjs --check   # CI: fail if a committed wiring.svg is stale or missing
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const Pinout = require(join(ROOT, "site/assets/js/engines/pinout.js"));
const board = require(join(ROOT, "site/assets/js/data/bluepill-pins.js"));
const wiring = require(join(ROOT, "site/assets/js/data/wiring.js"));
const check = process.argv.includes("--check");
const folders = readdirSync(join(ROOT, "examples")).filter((d) => /^\d\d-/.test(d));
let bad = 0;
for (const [id, spec] of Object.entries(wiring)) {
  // "NN" -> examples/NN-*/wiring.svg; "tl-<node>" -> capstone/turnlight/wiring-<node>.svg
  const ex = folders.find((d) => d.startsWith(id + "-"));
  const rel = id.startsWith("tl-") ? `capstone/turnlight/wiring-${id.slice(3)}.svg` : ex ? `examples/${ex}/wiring.svg` : null;
  if (!rel) { console.error(`ERROR wiring "${id}": no examples/${id}-* folder`); bad++; continue; }
  const dest = join(ROOT, rel);
  const svg = Pinout.render(board, { mode: "wiring", standalone: true, ...spec }).svg + "\n";
  if (check) {
    if (!existsSync(dest) || readFileSync(dest, "utf8") !== svg) { console.error(`ERROR ${dest.slice(ROOT.length + 1)} is out of date: run node tools/export-wiring.mjs`); bad++; }
  } else {
    writeFileSync(dest, svg);
    console.log(`wrote ${rel}`);
  }
}
console.log(`export-wiring: ${Object.keys(wiring).length} diagram(s), ${bad} error(s)`);
process.exit(bad ? 1 : 0);

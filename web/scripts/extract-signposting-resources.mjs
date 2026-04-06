/**
 * One-off maintenance: parse signposting array from page.tsx and write JSON.
 * Run: node scripts/extract-signposting-resources.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(__dirname, "../app/signposting/page.tsx");
const outPath = path.join(__dirname, "../data/signposting-resources.json");

const src = fs.readFileSync(pagePath, "utf8");
const marker = "const signpostingData: Section[] = ";
const i = src.indexOf(marker);
if (i < 0) throw new Error("Could not find signpostingData marker");

let j = i + marker.length;
while (j < src.length && /\s/.test(src[j])) j++;
if (src[j] !== "[") throw new Error("Expected [ after marker");

let depth = 0;
const start = j;
for (let k = start; k < src.length; k++) {
  const c = src[k];
  if (c === "[") depth++;
  else if (c === "]") {
    depth--;
    if (depth === 0) {
      const expr = src.slice(start, k + 1);
      // eslint-disable-next-line no-eval
      const sections = (0, eval)(`(${expr})`);
      fs.writeFileSync(outPath, JSON.stringify({ sections }, null, 2) + "\n", "utf8");
      console.log("Wrote", outPath, "sections:", sections.length);
      process.exit(0);
    }
  }
}

throw new Error("Unclosed array");

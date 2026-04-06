import { readFileSync } from "fs";
import { join } from "path";
import { finalizeHybridHits } from "../lib/search/hybrid-core";
import { lexicalSearchListings } from "../lib/search/lexical";

type Row = {
  query: string;
  expectSubcategorySlug: string | string[];
  minRank?: number;
};

async function main() {
  const p = join(process.cwd(), "data", "search-golden.json");
  const rows = JSON.parse(readFileSync(p, "utf-8")) as Row[];
  let fail = 0;
  for (const row of rows) {
    const k = row.minRank ?? 30;
    const lex = lexicalSearchListings(row.query, 120);
    const lexicalIds = lex.map((h) => h.listing.id);
    const hits = finalizeHybridHits(row.query, lexicalIds, [], {
      limit: k,
      candidatePool: 220,
    });
    const expectSlugs = Array.isArray(row.expectSubcategorySlug)
      ? row.expectSubcategorySlug
      : [row.expectSubcategorySlug];
    const topSlugs = hits.map((h) => h.listing.subcategory);
    const ok = expectSlugs.some((s) => topSlugs.includes(s));
    if (!ok) {
      console.error(
        "FAIL",
        JSON.stringify(row.query),
        "expected one of",
        expectSlugs,
        "top:",
        topSlugs.slice(0, 12),
      );
      fail++;
    } else {
      console.log("ok", row.query);
    }
  }
  if (fail > 0) {
    console.error(`\n${fail} golden check(s) failed.`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

void main();

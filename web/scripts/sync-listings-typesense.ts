/**
 * Upsert merged directory listings into Typesense (`directory_listings`).
 *
 * Loads `web/.env` then `web/.env.local` (override).
 *
 * Env: TYPESENSE_HOST, TYPESENSE_API_KEY; optional TYPESENSE_PROTOCOL, TYPESENSE_PORT
 *
 * Run: cd web && npm run listings:sync-typesense
 */

import "./load-dotenv";
import { fetchAllListings } from "../lib/data";
import { DIRECTORY_LISTINGS_COLLECTION } from "../lib/search/typesense-listings-config";
import { ensureTypesenseListingsCollection } from "../lib/search/typesense-listings-index";
import {
  buildTypesenseListingsClientFromEnv,
  listingToTypesenseDocument,
  type ListingTypesenseDocument,
} from "../lib/search/typesense-listings-client";

const SYNC_CHUNK = 200;

function logTypesenseImportFailures(importResult: string): void {
  const lines = importResult.split("\n").filter(Boolean);
  let failed = 0;
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as { success?: boolean; error?: string };
      if (row.success === false) {
        failed += 1;
        if (failed <= 5) console.warn("Typesense import line error:", row.error ?? line);
      }
    } catch {
      /* ignore */
    }
  }
  if (failed > 5) console.warn(`Typesense: ${failed} document lines failed (showing first 5 above).`);
}

async function upsertChunk(
  client: NonNullable<ReturnType<typeof buildTypesenseListingsClientFromEnv>>,
  chunk: ListingTypesenseDocument[],
): Promise<void> {
  const col = client.collections(DIRECTORY_LISTINGS_COLLECTION);
  const importResult = await col.documents().import(chunk, { action: "upsert" });
  if (typeof importResult === "string") logTypesenseImportFailures(importResult);
  else if (Array.isArray(importResult)) {
    const bad = importResult.filter(
      (r) => r && typeof r === "object" && (r as { success?: boolean }).success === false,
    );
    if (bad.length) console.warn("Typesense import failures:", bad.slice(0, 5));
  }
}

async function main() {
  const client = buildTypesenseListingsClientFromEnv({ connectionTimeoutSeconds: 120 });
  if (!client) {
    console.error("Missing TYPESENSE_HOST and/or TYPESENSE_API_KEY");
    process.exit(1);
  }

  await ensureTypesenseListingsCollection(client);

  const listings = fetchAllListings();
  const docs = listings.map(listingToTypesenseDocument);
  console.log("Documents to index:", docs.length, "collection:", DIRECTORY_LISTINGS_COLLECTION);

  for (let i = 0; i < docs.length; i += SYNC_CHUNK) {
    const chunk = docs.slice(i, i + SYNC_CHUNK);
    console.log(`Typesense import ${chunk.length} docs (offset ${i})…`);
    await upsertChunk(client, chunk);
  }

  console.log("Done.");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

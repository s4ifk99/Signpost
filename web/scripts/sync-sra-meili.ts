/**
 * Fetch all organisations from SRA Data Share GetAll, upsert into MySQL (when DATABASE_URL
 * is set), then upsert into Meilisearch.
 *
 * Loads `web/.env` then `web/.env.local` (override) so `npm run sra:sync` picks up Next.js-style secrets.
 * CI should keep using real environment variables (no file required).
 *
 * Env:
 *   SRA_APIM_SUBSCRIPTION_KEY (required)
 *   MEILISEARCH_HOST, MEILISEARCH_API_KEY (required)
 *   DATABASE_URL (optional) — mysql://… When set, each batch is written to DB before Meilisearch.
 *   SRA_ORGANISATIONS_URL (optional, default: official GetAll URL)
 *
 * Run from repo: cd web && npm run sra:sync
 */

import "./load-dotenv";
import { PrismaClient } from "@prisma/client";
import { MeiliSearch } from "meilisearch";
import { upsertSraDocumentsMysql } from "../lib/sra-mysql-sync";
import { ensureSraIndex } from "../lib/search/meilisearch-index";
import { SRA_MEILISEARCH_INDEX } from "../lib/search/meilisearch-config";
import {
  normaliseSraOrganisation,
  type SraMeiliDocument,
} from "../lib/search/sra-document";

const DEFAULT_SRA_URL =
  "https://sra-prod-apim.azure-api.net/datashare/api/V1/organisation/GetAll";

/** Align DB + Meili chunks; each chunk is fully committed to MySQL before Meilisearch. */
const SYNC_CHUNK = 500;

function extractRows(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  for (const k of [
    "value",
    "items",
    "data",
    "organisations",
    "Organisations",
    "results",
    "Results",
  ]) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function extractNextUrl(body: unknown, currentUrl: string): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const n = o["@odata.nextLink"] ?? o.nextLink ?? o.NextLink ?? o.next ?? o.Next;
  if (typeof n !== "string" || !n.trim()) return null;
  if (n.startsWith("http")) return n;
  try {
    return new URL(n, currentUrl).toString();
  } catch {
    return null;
  }
}

async function fetchAllOrganisations(
  key: string,
  startUrl: string,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  const seen = new Set<string>();
  let url: string | null = startUrl;

  while (url) {
    if (seen.has(url)) {
      console.warn("Pagination repeated URL, stopping:", url);
      break;
    }
    seen.add(url);
    const res = await fetch(url, {
      headers: { "Ocp-Apim-Subscription-Key": key },
    });
    if (!res.ok) {
      throw new Error(`SRA HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const body: unknown = await res.json();
    rows.push(...extractRows(body));
    url = extractNextUrl(body, url);
    if (url) console.log(`Fetched page, total rows so far: ${rows.length}, next…`);
  }

  return rows;
}

async function main() {
  const sraKey = process.env.SRA_APIM_SUBSCRIPTION_KEY?.trim();
  const host = process.env.MEILISEARCH_HOST?.trim();
  const meiliKey = process.env.MEILISEARCH_API_KEY?.trim() ?? "";
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!sraKey) {
    console.error("Missing SRA_APIM_SUBSCRIPTION_KEY");
    process.exit(1);
  }
  if (!host) {
    console.error("Missing MEILISEARCH_HOST");
    process.exit(1);
  }

  const prisma = databaseUrl ? new PrismaClient() : null;
  if (prisma) {
    console.log("DATABASE_URL set — will upsert MySQL table sra_organisations before each Meilisearch batch.");
  } else {
    console.log("DATABASE_URL not set — skipping MySQL (Meilisearch only).");
  }

  const startUrl = process.env.SRA_ORGANISATIONS_URL?.trim() || DEFAULT_SRA_URL;
  console.log("Fetching SRA organisations from:", startUrl);
  const rawRows = await fetchAllOrganisations(sraKey, startUrl);
  console.log("Raw organisation rows:", rawRows.length);

  const docs: SraMeiliDocument[] = [];
  for (const row of rawRows) {
    if (!row || typeof row !== "object") continue;
    const doc = normaliseSraOrganisation(row as Record<string, unknown>);
    if (doc) docs.push(doc);
  }
  console.log("Normalised documents:", docs.length);

  const client = new MeiliSearch({ host, apiKey: meiliKey });
  await ensureSraIndex(client);
  const index = client.index(SRA_MEILISEARCH_INDEX);

  try {
    for (let i = 0; i < docs.length; i += SYNC_CHUNK) {
      const chunk = docs.slice(i, i + SYNC_CHUNK);
      if (prisma) {
        console.log(`MySQL upsert ${chunk.length} docs (offset ${i})…`);
        await upsertSraDocumentsMysql(prisma, chunk);
      }
      const task = await index.addDocuments(chunk);
      console.log(
        `Meilisearch addDocuments task ${task.taskUid} (${chunk.length} docs, offset ${i})`,
      );
      await client.tasks.waitForTask(task.taskUid, { timeout: 600_000 });
    }
  } finally {
    await prisma?.$disconnect();
  }

  console.log("Done. Index:", SRA_MEILISEARCH_INDEX);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

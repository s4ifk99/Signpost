import "server-only";

import { MeiliSearch } from "meilisearch";
import { SRA_MEILISEARCH_INDEX } from "@/lib/search/meilisearch-config";
import type { SraMeiliDocument } from "@/lib/search/sra-document";

function getClient(): MeiliSearch | null {
  const host = process.env.MEILISEARCH_HOST?.trim();
  if (!host) return null;
  const apiKey = process.env.MEILISEARCH_API_KEY?.trim() ?? "";
  return new MeiliSearch({ host, apiKey });
}

function escapeFilterValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function searchSraOrganisations(
  query: string,
  options: { limit: number; city?: string },
): Promise<SraMeiliDocument[]> {
  const client = getClient();
  const q = query.trim();
  if (!client || !q) return [];

  const filters: string[] = [];
  if (options.city?.trim()) {
    filters.push(`city = "${escapeFilterValue(options.city.trim())}"`);
  }

  try {
    const res = await client.index(SRA_MEILISEARCH_INDEX).search<SraMeiliDocument>(q, {
      limit: Math.min(120, Math.max(1, options.limit)),
      filter: filters.length ? filters.join(" AND ") : undefined,
      attributesToRetrieve: ["*"],
    });
    return res.hits ?? [];
  } catch (e) {
    console.warn("[meilisearch-sra] search failed:", e);
    return [];
  }
}

export async function meilisearchConfigured(): Promise<boolean> {
  return Boolean(process.env.MEILISEARCH_HOST?.trim());
}

export async function meilisearchReachable(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.health();
    return true;
  } catch {
    return false;
  }
}

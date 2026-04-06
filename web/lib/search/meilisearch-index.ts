import type { MeiliSearch } from "meilisearch";
import { SRA_MEILISEARCH_INDEX } from "@/lib/search/meilisearch-config";

/** Create index if missing and apply settings for SRA organisation search. */
export async function ensureSraIndex(client: MeiliSearch): Promise<void> {
  const { results } = await client.getIndexes();
  if (!results.some((r) => r.uid === SRA_MEILISEARCH_INDEX)) {
    await client.createIndex(SRA_MEILISEARCH_INDEX, { primaryKey: "id" });
  }

  await client.index(SRA_MEILISEARCH_INDEX).updateSettings({
    searchableAttributes: [
      "businessName",
      "searchText",
      "postcode",
      "city",
      "county",
      "sraId",
    ],
    filterableAttributes: ["country", "city", "source"],
    displayedAttributes: ["*"],
  });
}

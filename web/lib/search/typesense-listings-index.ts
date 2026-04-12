import Typesense from "typesense";
import type { CollectionFieldSchema } from "typesense";
import { DIRECTORY_LISTINGS_COLLECTION } from "@/lib/search/typesense-listings-config";

type TsClient = InstanceType<typeof Typesense.Client>;

const fields: CollectionFieldSchema[] = [
  { name: "id", type: "string" },
  { name: "searchText", type: "string", optional: true },
  { name: "businessName", type: "string", optional: true },
  { name: "description", type: "string", optional: true },
  { name: "category", type: "string", optional: true },
  { name: "subcategory", type: "string", optional: true, facet: true },
  { name: "city", type: "string", optional: true, facet: true },
  { name: "postcode", type: "string", optional: true },
  { name: "phone", type: "string", optional: true },
  { name: "isFree", type: "bool", facet: true },
  { name: "isLegalAid", type: "bool", optional: true, facet: true },
];

/** Create Typesense collection for directory listings if missing. */
export async function ensureTypesenseListingsCollection(client: TsClient): Promise<void> {
  try {
    await client.collections(DIRECTORY_LISTINGS_COLLECTION).retrieve();
  } catch (e: unknown) {
    const http = (e as { httpStatus?: number })?.httpStatus;
    if (http !== 404) throw e;
    await client.collections().create({
      name: DIRECTORY_LISTINGS_COLLECTION,
      fields,
    });
  }
}

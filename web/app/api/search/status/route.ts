import { NextResponse } from "next/server";
import { loadEmbeddingsBundle } from "@/lib/embeddings-store";
import { DIRECTORY_LISTINGS_COLLECTION } from "@/lib/search/typesense-listings-config";
import {
  typesenseListingsConfigured,
  typesenseListingsReachable,
} from "@/lib/search/typesense-listings";

export const runtime = "nodejs";

/** Operator-facing check: embeddings + Typesense listings (no secrets exposed). */
export async function GET() {
  const bundle = loadEmbeddingsBundle();
  const tsConfigured = typesenseListingsConfigured();
  const tsOk = tsConfigured ? await typesenseListingsReachable() : false;

  return NextResponse.json({
    embeddingsLoaded: Boolean(bundle),
    embeddingModelId: bundle?.modelId ?? null,
    embeddingDim: bundle?.dim ?? null,
    listingVectorCount: bundle?.ids.length ?? 0,
    hfTokenConfigured: Boolean(process.env.HF_TOKEN?.trim()),
    typesenseListingsConfigured: tsConfigured,
    typesenseListingsReachable: tsOk,
    directoryListingsCollection: DIRECTORY_LISTINGS_COLLECTION,
  });
}

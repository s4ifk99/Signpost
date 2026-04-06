import { NextResponse } from "next/server";
import { loadEmbeddingsBundle } from "@/lib/embeddings-store";
import {
  meilisearchConfigured,
  meilisearchReachable,
} from "@/lib/search/meilisearch-sra";
import { SRA_MEILISEARCH_INDEX } from "@/lib/search/meilisearch-config";

export const runtime = "nodejs";

/** Operator-facing check: semantic + Meilisearch readiness (no secrets exposed). */
export async function GET() {
  const bundle = loadEmbeddingsBundle();
  const meiliConfigured = await meilisearchConfigured();
  const meiliOk = meiliConfigured ? await meilisearchReachable() : false;

  return NextResponse.json({
    embeddingsLoaded: Boolean(bundle),
    embeddingModelId: bundle?.modelId ?? null,
    embeddingDim: bundle?.dim ?? null,
    listingVectorCount: bundle?.ids.length ?? 0,
    hfTokenConfigured: Boolean(process.env.HF_TOKEN?.trim()),
    meilisearchConfigured: meiliConfigured,
    meilisearchReachable: meiliOk,
    sraIndexUid: SRA_MEILISEARCH_INDEX,
  });
}

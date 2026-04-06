import "server-only";

import fs from "fs";
import path from "path";

export type EmbeddingsBundle = {
  modelId: string;
  dim: number;
  ids: string[];
  /** Row-major, L2-normalized rows; length ids.length * dim */
  matrix: Float32Array;
};

let cache: EmbeddingsBundle | null | undefined;

function dataDir(): string {
  return path.join(process.cwd(), "data");
}

export function loadEmbeddingsBundle(): EmbeddingsBundle | null {
  if (cache !== undefined) return cache;

  const metaPath = path.join(dataDir(), "listings-embeddings-meta.json");
  const binPath = path.join(dataDir(), "listings-embeddings.bin");
  if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) {
    cache = null;
    return null;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as {
    modelId: string;
    dim: number;
    ids: string[];
    count: number;
  };

  const buf = fs.readFileSync(binPath);
  const expected = meta.count * meta.dim * 4;
  if (buf.byteLength !== expected) {
    console.warn(
      `[embeddings] listings-embeddings.bin size mismatch (got ${buf.byteLength}, expected ${expected})`,
    );
    cache = null;
    return null;
  }

  const matrix = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  cache = { modelId: meta.modelId, dim: meta.dim, ids: meta.ids, matrix };
  return cache;
}

/** Cosine similarity top-k when rows and query are L2-normalized → dot product. */
export function semanticTopIds(
  queryVector: Float32Array,
  bundle: EmbeddingsBundle,
  topK: number,
): string[] {
  const { dim, ids, matrix } = bundle;
  if (queryVector.length !== dim) return [];

  const scores: { id: string; s: number }[] = [];
  const n = ids.length;
  for (let i = 0; i < n; i++) {
    const off = i * dim;
    let dot = 0;
    for (let d = 0; d < dim; d++) dot += queryVector[d] * matrix[off + d]!;
    scores.push({ id: ids[i]!, s: dot });
  }
  scores.sort((a, b) => b.s - a.s);
  return scores.slice(0, topK).map((x) => x.id);
}

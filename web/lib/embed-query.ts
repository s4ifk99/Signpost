import "server-only";

import { HfInference } from "@huggingface/inference";

const DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

function l2Normalize(arr: Float32Array): Float32Array {
  let n = 0;
  for (let i = 0; i < arr.length; i++) n += arr[i]! * arr[i]!;
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < arr.length; i++) arr[i]! /= n;
  return arr;
}

function flattenFeatureVector(raw: unknown, expectedDim: number): Float32Array | null {
  const nums: number[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "number") nums.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
  };
  walk(raw);
  if (nums.length === 0) return null;
  if (nums.length === expectedDim) return l2Normalize(new Float32Array(nums));
  if (nums.length % expectedDim === 0) {
    const slice = nums.slice(0, expectedDim);
    return l2Normalize(new Float32Array(slice));
  }
  return null;
}

/**
 * Embeds user query using Hugging Face Inference API (server-side only; requires HF_TOKEN).
 * Returns null if token missing or request fails.
 */
export async function embedQueryWithHf(
  text: string,
  modelId: string = DEFAULT_MODEL,
  expectedDim = 384,
): Promise<Float32Array | null> {
  const token = process.env.HF_TOKEN;
  if (!token?.trim()) return null;

  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) return null;

  try {
    const hf = new HfInference(token);
    const raw = await hf.featureExtraction({
      model: modelId,
      inputs: trimmed,
    });
    return flattenFeatureVector(raw, expectedDim);
  } catch (e) {
    console.warn("[embed-query] HF featureExtraction failed:", e);
    return null;
  }
}

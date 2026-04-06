#!/usr/bin/env python3
"""
Precompute L2-normalized embeddings for merged ADL listings (same text as getListingSearchDocument in TS).

Requires:
  pip install sentence-transformers torch

Input:  web/data/all-listings-embed-input.json  (run: npm run embed:dump in web/)
Output: web/data/listings-embeddings-meta.json
        web/data/listings-embeddings.bin       (float32 row-major, normalized rows)

Model (Apache-2.0): sentence-transformers/all-MiniLM-L6-v2  (384 dims)
"""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
INPUT_JSON = DATA / "all-listings-embed-input.json"
OUT_META = DATA / "listings-embeddings-meta.json"
OUT_BIN = DATA / "listings-embeddings.bin"

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"


def listing_document(row: dict) -> str:
    gov = (row.get("legalAidGovCategory") or "").strip()
    gov_line = f"Area of law (GOV.UK): {gov}" if gov else ""
    parts = [
        row.get("businessName") or "",
        row.get("description") or "",
        gov_line,
        row.get("category") or "",
        row.get("subcategory") or "",
        row.get("city") or "",
        row.get("postcode") or "",
        row.get("phone") or "",
    ]
    return "\n".join(p for p in parts if p)


def main() -> int:
    if not INPUT_JSON.is_file():
        print(f"Missing {INPUT_JSON}; run: cd web && npm run embed:dump", file=sys.stderr)
        return 1

    rows = json.loads(INPUT_JSON.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        print("Input JSON must be a non-empty array", file=sys.stderr)
        return 1

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(MODEL_ID)
    texts = [listing_document(r) for r in rows]
    ids = [str(r.get("id", "")) for r in rows]

    emb = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    if emb.ndim != 2:
        print("Unexpected embedding shape", file=sys.stderr)
        return 1

    dim = emb.shape[1]
    count = emb.shape[0]
    flat = np.asarray(emb, dtype=np.float32).tobytes()

    OUT_BIN.write_bytes(flat)
    meta = {
        "modelId": MODEL_ID,
        "dim": dim,
        "count": count,
        "ids": ids,
    }
    OUT_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_META} and {OUT_BIN} ({count} x {dim})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Download and normalize the latest GOV.UK legal aid provider directory.

Outputs:
- data/legal_aid_providers_latest.csv
- data/legal_aid_providers_meta.json

Run from project root:
  python scripts/update-legal-aid-providers.py
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd
import requests


SOURCE_PAGE = (
    "https://www.gov.uk/government/publications/directory-of-legal-aid-providers"
)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_CSV = DATA_DIR / "legal_aid_providers_latest.csv"
OUT_META = DATA_DIR / "legal_aid_providers_meta.json"


def slug_col(name: str) -> str:
    name = str(name or "").strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    return name.strip("_") or "col"


def discover_xlsx_url(session: requests.Session) -> str:
    resp = session.get(SOURCE_PAGE, timeout=60)
    resp.raise_for_status()
    html = resp.text

    # Prefer attachment links that include ".xlsx".
    matches = re.findall(r'href="([^"]+?\.xlsx[^"]*)"', html, flags=re.IGNORECASE)
    if not matches:
        raise RuntimeError("Could not find XLSX link on GOV.UK source page.")

    # Heuristic: pick the first .xlsx link, converting relative to absolute URL.
    return urljoin(SOURCE_PAGE, matches[0])


def normalize_sheet(df: pd.DataFrame, sheet_name: str, pulled_at: str, source_xlsx: str) -> pd.DataFrame:
    renamed = {}
    seen = {}
    for c in df.columns:
        base = slug_col(c)
        n = seen.get(base, 0)
        seen[base] = n + 1
        renamed[c] = f"{base}_{n+1}" if n else base
    out = df.rename(columns=renamed)
    out["source_sheet"] = sheet_name
    out["source_xlsx_url"] = source_xlsx
    out["pulled_at_utc"] = pulled_at
    return out


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    pulled_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "SignpostLegalDirectoryBot/1.0 (+https://github.com/s4ifk99/Signpost)"
        }
    )

    source_xlsx_url = discover_xlsx_url(session)
    xlsx_resp = session.get(source_xlsx_url, timeout=120)
    xlsx_resp.raise_for_status()

    tmp_xlsx = DATA_DIR / "_latest_legal_aid_providers.xlsx"
    tmp_xlsx.write_bytes(xlsx_resp.content)

    sheets = pd.read_excel(tmp_xlsx, sheet_name=None, dtype=str)
    normalized_frames = []
    sheet_stats = []

    for sheet_name, df in sheets.items():
        df = df.fillna("")
        df = df.loc[:, [c for c in df.columns if str(c).strip() != ""]]
        if df.empty:
            sheet_stats.append({"sheet": sheet_name, "rows": 0})
            continue
        ndf = normalize_sheet(df, sheet_name, pulled_at, source_xlsx_url)
        normalized_frames.append(ndf)
        sheet_stats.append({"sheet": sheet_name, "rows": int(len(ndf))})

    if normalized_frames:
        merged = pd.concat(normalized_frames, ignore_index=True)
    else:
        merged = pd.DataFrame(
            columns=["source_sheet", "source_xlsx_url", "pulled_at_utc"]
        )

    merged.to_csv(OUT_CSV, index=False, encoding="utf-8")

    meta = {
        "source_page": SOURCE_PAGE,
        "source_xlsx_url": source_xlsx_url,
        "pulled_at_utc": pulled_at,
        "total_rows": int(len(merged)),
        "total_sheets": len(sheet_stats),
        "sheet_stats": sheet_stats,
        "output_csv": str(OUT_CSV.relative_to(ROOT)).replace("\\", "/"),
    }
    OUT_META.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Keep workspace clean.
    if tmp_xlsx.exists():
        tmp_xlsx.unlink()

    print(f"Wrote {OUT_CSV} ({len(merged)} rows)")
    print(f"Wrote {OUT_META}")


if __name__ == "__main__":
    main()


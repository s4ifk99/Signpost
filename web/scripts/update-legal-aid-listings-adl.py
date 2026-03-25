#!/usr/bin/env python3
"""
Monthly ingest for the GOV.UK Legal Aid provider directory.

Downloads the latest GOV.UK spreadsheet and generates:
- data/legal-aid-listings.json
- data/legal-aid-listings-meta.json

The output entries are shaped to match the V0 app's ADL Listing model:
  id, businessName, contactName, phone, email, address, city, postcode,
  category (parent category label), subcategory (slug),
  description, website?, isFree, isSponsored, isLegalAid,
  legalAidGovCategory (extra field used for validation/debug)

Run:
  python scripts/update-legal-aid-listings-adl.py
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urljoin

import pandas as pd
import requests


SOURCE_PAGE = "https://www.gov.uk/government/publications/directory-of-legal-aid-providers"
GOV_XLSX_LINK_RE = re.compile(r'href="([^"]+?\.xlsx[^"]*)"', re.IGNORECASE)
PHONE_LIKE_RE = re.compile(r"\b(\+?\d[\d\s()-]{6,})\b")

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT_LISTINGS = DATA_DIR / "legal-aid-listings.json"
OUT_META = DATA_DIR / "legal-aid-listings-meta.json"
MAPPING_RULES_PATH = DATA_DIR / "legal-aid-mapping-rules.json"


def slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"&", " and ", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"(^-|-$)", "", s)
    return s


def looks_like_provider_name(v: str) -> bool:
    t = (v or "").strip()
    if not t:
        return False
    # Skip common non-data rows.
    if any(
        x in t.lower()
        for x in [
            "date refreshed",
            "provider name",
            "about the data",
            "summary",
            "sheet tab",
            "published monthly",
        ]
    ):
        return False
    # Require letters.
    return bool(re.search(r"[a-zA-Z]", t))


def normalize_sheet(df: pd.DataFrame, sheet_name: str, pulled_at: str, source_xlsx: str) -> pd.DataFrame:
    """
    Create stable column names by slugifying each column header.

    This mirrors the Signpost ingest script approach, and is important because we
    refer to fields by their normalized column names (e.g. unnamed_6).
    """

    def slug_col(name: str) -> str:
        name = str(name or "").strip().lower()
        name = re.sub(r"[^a-z0-9]+", "_", name)
        return name.strip("_") or "col"

    renamed: Dict[Any, str] = {}
    seen: Dict[str, int] = {}
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


def discover_xlsx_url(session: requests.Session) -> str:
    resp = session.get(SOURCE_PAGE, timeout=60)
    resp.raise_for_status()
    html = resp.text
    matches = GOV_XLSX_LINK_RE.findall(html)
    if not matches:
        raise RuntimeError("Could not find XLSX link on GOV.UK source page.")
    return urljoin(SOURCE_PAGE, matches[0])


def load_rules() -> Dict[str, Any]:
    return json.loads(MAPPING_RULES_PATH.read_text(encoding="utf-8"))


def map_gov_category(gov_category: str, rules: Dict[str, Any]) -> Dict[str, str]:
    """
    Match gov_category by case-insensitive substring rules.
    """
    t = (gov_category or "").strip().lower()
    if not t:
        return rules["default"]

    for rule in rules.get("rules", []):
        for needle in rule.get("containsAny", []):
            if needle.lower() in t:
                return {
                    "subcategorySlug": rule["subcategorySlug"],
                    "parentCategory": rule["parentCategory"],
                }

    return rules["default"]


@dataclass
class Listing:
    id: str
    businessName: str
    contactName: str
    phone: str
    email: str
    address: str
    city: str
    postcode: str
    category: str
    subcategory: str
    description: str
    website: Optional[str]
    isFree: bool
    isSponsored: bool
    isLegalAid: bool
    # Extra field (not shown in UI) used for validation/debugging.
    legalAidGovCategory: Optional[str] = None

    def to_json(self) -> Dict[str, Any]:
        d = self.__dict__.copy()
        if not self.website:
            d.pop("website", None)
        return d


def clean_phone(v: str) -> str:
    t = (v or "").strip()
    if not t:
        return ""
    m = PHONE_LIKE_RE.search(t)
    return m.group(1) if m else t


def split_city_from_address(address: str) -> Tuple[str, str]:
    """
    Best-effort: if address ends with a single word, treat that as city.
    Example:
      "33A Hungerhill Road Nottingham" -> ("33A Hungerhill Road", "Nottingham")
    """
    t = (address or "").strip()
    if not t:
        return "", ""
    parts = t.split()
    if len(parts) < 3:
        return t, ""
    city = parts[-1]
    addr = " ".join(parts[:-1])
    return addr, city


def build_listings_from_merged(merged: pd.DataFrame, rules: Dict[str, Any]) -> List[Listing]:
    listings: List[Listing] = []
    dedupe: set[str] = set()

    # Sheet-specific schemas for the normalized file.
    # These are derived from inspecting `data/legal_aid_providers_latest.csv`.
    schemas: List[Dict[str, Any]] = [
        {
            "source_sheet": "2025 Crime Providers",
            "provider_col": "2025_crime_contract_providers",
            "postcode_col": "unnamed_2",
            "gov_category": "Crime",
            "address": "",
            "phone_col": None,
            "city_col": None,
            "subcategory_default": "criminal-defence",
            "contactName": "Legal Aid (Crime) Adviser",
            "description_prefix": "Legal aid crime provider (office listed by GOV.UK).",
        },
        {
            "source_sheet": "2024 Civil PT & O Presence",
            "provider_col": "2024_standard_civil_contracted_providers_part_time_and_outreach_presence",
            "postcode_col": "unnamed_7",
            "gov_category_col": "unnamed_2",
            "address_col": "unnamed_6",
            "phone_col": None,
            "city_from_address": True,
            "contactName": "Legal Aid Adviser",
            "description_prefix": "Legal aid provider (part-time/outreach presence listed by GOV.UK).",
        },
        {
            "source_sheet": "2024 Civil authorisations",
            "provider_col": "2024_standard_civil_contracted_providers",
            "postcode_col": "unnamed_2",
            "gov_category_col": "unnamed_4",
            "city_col": "unnamed_5",
            "address": "",
            "phone_col": None,
            "contactName": "Legal Aid Adviser",
            "description_prefix": "Legal aid provider authorisations listed by GOV.UK.",
        },
        {
            "source_sheet": "Housing Loss Prevention Advice",
            "provider_col": "2024_standard_civil_contracted_providers_housing_loss_prevention_advice_service_hlpas",
            "postcode_col": "unnamed_8",
            "city_col": "unnamed_2",
            "address_parts": ["unnamed_5", "unnamed_6"],
            "phone_col": "unnamed_9",
            "gov_category": "Housing",
            "contactName": "Legal Aid Adviser (Housing)",
            "description_prefix": "Housing Loss Prevention Advice Service (HLPAS) provider (GOV.UK listing).",
        },
        {
            "source_sheet": "Modern Slavery",
            "provider_col": "2024_standard_civil_contracted_providers_for_modern_slavery",
            "postcode_col": "unnamed_2",
            "gov_category_col": "unnamed_4",
            "address": "",
            "phone_col": None,
            "city": "",
            "contactName": "Legal Aid Adviser",
            "description_prefix": "Modern slavery legal aid provider (GOV.UK listing).",
        },
        {
            "source_sheet": "2024 Mediation Outreach",
            "provider_col": "2024_mediation_outreach_locations",
            "postcode_col": "unnamed_6",
            "gov_category": "Mediation",
            # unnamed_4 = address line, unnamed_5 = city, unnamed_7 = address line 2
            "address_parts": ["unnamed_4", "unnamed_7"],
            "city_col": "unnamed_5",
            "phone_col": None,
            "contactName": "Mediation Outreach Adviser",
            "description_prefix": "Mediation outreach location/provider (GOV.UK listing).",
        },
    ]

    for schema in schemas:
        sheet = schema["source_sheet"]
        provider_col = schema["provider_col"]

        if provider_col not in merged.columns:
            continue

        sub = merged[merged["source_sheet"] == sheet].copy()
        # Provider rows: provider_col present + looks like a provider name.
        sub["__provider_ok__"] = sub[provider_col].astype(str).apply(looks_like_provider_name)
        sub = sub[sub["__provider_ok__"]]

        for _, row in sub.iterrows():
            provider_name = str(row.get(provider_col, "")).strip().lstrip("@").strip()
            postcode = str(row.get(schema.get("postcode_col", ""), "") or "").strip()

            if not provider_name:
                continue

            # Determine gov category for mapping.
            if "gov_category_col" in schema:
                gov_cat = str(row.get(schema["gov_category_col"], "") or "").strip()
            else:
                gov_cat = schema.get("gov_category", "")

            mapped = map_gov_category(gov_cat, rules)
            parent_category = mapped["parentCategory"]
            subcategory_slug = mapped["subcategorySlug"]

            # Address/phone/city.
            phone = ""
            phone_col = schema.get("phone_col")
            if phone_col:
                phone = clean_phone(str(row.get(phone_col, "") or ""))

            address = ""
            if "address_col" in schema:
                address = str(row.get(schema["address_col"], "") or "").strip()
            if "address_parts" in schema:
                parts = [str(row.get(c, "") or "").strip() for c in schema["address_parts"]]
                address = ", ".join([p for p in parts if p])

            city = ""
            if schema.get("city_from_address"):
                address, city = split_city_from_address(address)
            elif "city_col" in schema:
                city = str(row.get(schema["city_col"], "") or "").strip()
            elif "city" in schema:
                city = str(schema["city"] or "").strip()

            contact_name = schema.get("contactName", "Legal Aid Adviser")
            desc_prefix = schema.get(
                "description_prefix", "Legal aid provider (GOV.UK listing)."
            )
            desc = (
                f"{desc_prefix} Area of law: {gov_cat}" if gov_cat else desc_prefix
            )

            listing_id = slugify(f"{provider_name}-{postcode}-{subcategory_slug}")
            dedupe_key = f"{listing_id}"
            if dedupe_key in dedupe:
                continue
            dedupe.add(dedupe_key)

            listings.append(
                Listing(
                    id=listing_id,
                    businessName=provider_name,
                    contactName=contact_name,
                    phone=phone,
                    email="",
                    address=address,
                    city=city,
                    postcode=postcode,
                    category=parent_category,
                    subcategory=subcategory_slug,
                    description=desc,
                    website=None,
                    isFree=False,
                    isSponsored=False,
                    isLegalAid=True,
                    legalAidGovCategory=gov_cat or None,
                )
            )

    return listings


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    rules = load_rules()
    pulled_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "SignpostLegalDirectoryBot/1.0 (+https://github.com/s4ifk99/Signpost)",
        }
    )

    source_xlsx_url = discover_xlsx_url(session)
    xlsx_resp = session.get(source_xlsx_url, timeout=180)
    xlsx_resp.raise_for_status()

    tmp_xlsx = DATA_DIR / "_latest_legal_aid_providers.xlsx"
    tmp_xlsx.write_bytes(xlsx_resp.content)

    try:
        sheets = pd.read_excel(tmp_xlsx, sheet_name=None, dtype=str)
        normalized_frames: List[pd.DataFrame] = []
        sheet_stats: List[Dict[str, Any]] = []

        for sheet_name, df in sheets.items():
            df = df.fillna("")
            # Keep all columns, even if headers are blank; we rely on normalized unnamed_* fields.
            # Only drop truly empty columns (all blanks).
            df = df.loc[:, [c for c in df.columns if not df[c].isna().all()]]
            ndf = normalize_sheet(df, sheet_name, pulled_at, source_xlsx_url)
            normalized_frames.append(ndf)
            sheet_stats.append({"sheet": sheet_name, "rows": int(len(ndf))})

        merged = pd.concat(normalized_frames, ignore_index=True) if normalized_frames else pd.DataFrame()

        listings = build_listings_from_merged(merged, rules)

        OUT_LISTINGS.write_text(
            json.dumps([l.to_json() for l in listings], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        # Mapping sanity checks for key categories.
        expected_checks = [
            ("Crime", "criminal-defence"),
            ("Housing", "housing-homelessness"),
            ("Debt", "debt-management"),
            ("Education", "education-law"),
            ("Mental Health", "mental-health-law"),
        ]

        checks: List[Dict[str, Any]] = []
        for needle, expected_slug in expected_checks:
            matches = [
                l
                for l in listings
                if l.legalAidGovCategory and needle.lower() in l.legalAidGovCategory.lower()
            ]
            ok = any(l.subcategory == expected_slug for l in matches) if matches else False
            checks.append(
                {
                    "govNeedle": needle,
                    "expectedSubcategorySlug": expected_slug,
                    "matchingListings": len(matches),
                    "passed": ok,
                }
            )

        meta = {
            "source_page": SOURCE_PAGE,
            "source_xlsx_url": source_xlsx_url,
            "pulled_at_utc": pulled_at,
            "total_listings": len(listings),
            "total_sheets": len(sheet_stats),
            "sheet_stats": sheet_stats,
            "mapping_checks": checks,
        }
        OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

        failed = [c for c in checks if not c["passed"]]
        if failed:
            # Fail loudly so the monthly workflow notices.
            raise RuntimeError(f"Mapping sanity checks failed: {failed}")

        print(f"Wrote {OUT_LISTINGS} ({len(listings)} listings)")
        print(f"Wrote {OUT_META}")
    finally:
        if tmp_xlsx.exists():
            tmp_xlsx.unlink()


if __name__ == "__main__":
    main()


# Signpost (Legal Services Directory)

Monorepo: a **static** Craigslist-style directory at the repo root, plus a **Next.js** app under `web/` — a **full UK legal services directory** by practice area, with **GOV.UK legal-aid provider rows as one merged data source** (filterable in search), optional **SRA / Meilisearch** national firms, curated category listings, and AI search.

## Run locally

### Static directory

Open `index.html` in your browser (scripts live in `static-site/`).

### Next.js app (`web/`)

```bash
cd web
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

**Windows PowerShell — “running scripts is disabled” / `npm.ps1` error:** Node installs `npm.ps1`, which PowerShell may block. Use one of: **`npm.cmd run sra:probe`** (and other scripts) instead of `npm run …`; or open **Command Prompt** (`cmd.exe`) instead of PowerShell; or allow local scripts for your user: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (review your org’s IT policy first).

**Deploying the Next.js app** (e.g. Vercel): set the project **root directory** to `web/` and use the default Next.js build settings.

**Semantic search (optional):** set `HF_TOKEN` (Hugging Face Inference API) in the deployment environment. Precomputed vectors live in `web/data/listings-embeddings.bin` + `listings-embeddings-meta.json` (model id and dimensions are in the meta file). Regenerate locally with `cd web && npm run embed:dump` then `python web/scripts/embed-listings.py` (requires `sentence-transformers`), or run the **Build listing embeddings** workflow. When the **monthly legal aid ingest** updates `legal-aid-listings.json`, the same workflow also regenerates embeddings if that JSON changed (so vectors stay aligned with listings).

**Search health:** with the app running, open `GET /api/search/status` (e.g. `http://localhost:3000/api/search/status`) to see whether embedding files and `HF_TOKEN` are present (no secrets returned).

**SRA + Meilisearch (optional, national directory):** the app does **not** store the full SRA register in Git. You **fetch** it from the API and **index** it in Meilisearch; search then merges those hits with **curated and legal-aid** listings (single search experience, not a legal-aid-only product).

**SRA + MySQL (system of record):** [`web/prisma/schema.prisma`](web/prisma/schema.prisma) defines table **`sra_organisations`**. When **`DATABASE_URL`** is set, **`npm run sra:sync`** upserts each batch to **MySQL first**, then to Meilisearch (if MySQL fails, that batch is not sent to Meili). Without `DATABASE_URL`, sync behaves as Meilisearch-only. Apply schema with `cd web && npm run db:migrate` (loads `.env` / `.env.local`; or `npm run db:migrate:dev` locally). Prisma client is generated on **`npm install`** / **`npm run build`**.

1. Subscribe at the [SRA API developer portal](https://sra-prod-apim.developer.azure-api.net) and copy your subscription key.
2. Run Meilisearch locally (example):  
   `docker run -d --name meili -p 7700:7700 -e MEILI_MASTER_KEY=dev_master_key getmeili/meilisearch:v1.11`
3. (Optional) Run MySQL and set **`DATABASE_URL`** in `.env.local` (see [`web/.env.example`](web/.env.example)); run **`cd web && npm run db:migrate`** once.
4. In `web/`, copy [`web/.env.example`](web/.env.example) to `.env.local` and set `SRA_APIM_SUBSCRIPTION_KEY`, `MEILISEARCH_HOST` (e.g. `http://127.0.0.1:7700`), and `MEILISEARCH_API_KEY` (use `dev_master_key` to match step 2).
5. From `web/`, run **`npm run sra:probe`** once to confirm the SRA subscription key returns **HTTP 200** (see [`docs/sra-api-fields.md`](docs/sra-api-fields.md) if you get 401/403).
6. Run **`npm run sra:sync`** — calls `GetAll`, normalises rows, upserts **MySQL** (if configured) then Meilisearch index **`sra_organisations`**.
7. Start the app with **`npm run dev`**; open `/search` and `/api/search/status` (expect `meilisearchConfigured` / `meilisearchReachable` true).

For production, use a **search-only** Meilisearch API key in the Next.js environment; keep `SRA_APIM_SUBSCRIPTION_KEY` only on the machine or CI that runs sync. Scheduled sync: [`.github/workflows/sra-meilisearch-sync.yml`](.github/workflows/sra-meilisearch-sync.yml) (secrets: `SRA_APIM_SUBSCRIPTION_KEY`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`; optional **`DATABASE_URL`** for dual-write). Field notes: [`docs/sra-api-fields.md`](docs/sra-api-fields.md).

**Search regression checks:** `cd web && npm run test:search-golden` runs fuzzy-search expectations in [`web/data/search-golden.json`](web/data/search-golden.json).

**Signposting hub:** national links are edited in [`web/data/signposting-resources.json`](web/data/signposting-resources.json); [`web/data/signposting-advocate.json`](web/data/signposting-advocate.json) is a stub for a future Advocate/bar feed. The `/signposting` page explains the **full-directory** model (curated + legal aid + optional SRA), shows live counts from the merged index, and links into `/search` and category pages.

## CSV export

The same directory is available as **`data/services.csv`** (columns: title, category, summary, areas_of_law, tags, coverage, phone, email, hours, cta, website, affiliate, sponsored, priority).

Regenerate locally with:

```bash
node scripts/json-to-csv.js
```

CSV sync is also automated in GitHub Actions via `.github/workflows/sync-services-csv.yml`.
On pushes to `main` (or PRs) that touch `data/services.json` or `scripts/json-to-csv.js`,
the workflow regenerates `data/services.csv`; on `main` pushes, it auto-commits updated CSV output.

## Monthly GOV.UK legal aid provider ingest

This project now includes a monthly ingest pipeline for the Legal Aid Agency provider directory from GOV.UK:

- Source page: `https://www.gov.uk/government/publications/directory-of-legal-aid-providers`
- Script: `scripts/update-legal-aid-providers.py`
- Workflow: `.github/workflows/monthly-legal-aid-ingest.yml`

### Outputs

- `data/legal_aid_providers_latest.csv` (normalized provider rows from all workbook sheets)
- `data/legal_aid_providers_meta.json` (source URL, pull timestamp, sheet/row stats)

### Schedule

Runs automatically on the 2nd day of every month at 06:00 UTC, and can be run manually from the GitHub Actions tab (`workflow_dispatch`).

The same workflow also regenerates **`web/data/legal-aid-listings.json`** (and meta) for the Next.js app via `web/scripts/update-legal-aid-listings-adl.py`, and refreshes **`web/data/listings-embeddings.bin`** when the legal-aid JSON changes (keeps semantic search in sync).

## Edit listings

Update `data/services.json`.

Each listing supports:
- `title`: service name
- `category`: must match a category in the file
- `summary`: one-line description
- `tags`: array of short labels
- `cta`: button text (e.g., "Visit", "Get help", "Check eligibility")
- `url`: destination URL
- `affiliate`: set `true` if it’s an affiliate/partner link
- `priority`: higher shows first within a category

## Affiliate tracking

Affiliate buttons automatically append URL parameters (UTM) in `static-site/config.js`.
Edit:
- `UTM_SOURCE`
- `UTM_MEDIUM`
- `UTM_CAMPAIGN`

If a URL already contains `utm_*`, the script will keep the existing values.


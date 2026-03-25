# Signpost (Legal Services Directory)

Monorepo: a **static** Craigslist-style directory at the repo root, plus a **Next.js** app under `web/` (categories, legal-aid listings, AI search).

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

**Deploying the Next.js app** (e.g. Vercel): set the project **root directory** to `web/` and use the default Next.js build settings.

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

The same workflow also regenerates **`web/data/legal-aid-listings.json`** (and meta) for the Next.js app via `web/scripts/update-legal-aid-listings-adl.py`.

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


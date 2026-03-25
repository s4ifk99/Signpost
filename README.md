# Signpost (Legal Services Directory)

Craigslist-style directory of legal help services, designed for an affiliate-style business model.

## Run locally

Open `index.html` in your browser.

## CSV export

The same directory is available as **`data/services.csv`** (columns: title, category, summary, areas_of_law, tags, coverage, phone, email, hours, cta, website, affiliate, sponsored, priority).

Regenerate locally with:

```bash
node scripts/json-to-csv.js
```

CSV sync is also automated in GitHub Actions via `.github/workflows/sync-services-csv.yml`.
On pushes to `main` (or PRs) that touch `data/services.json` or `scripts/json-to-csv.js`,
the workflow regenerates `data/services.csv`; on `main` pushes, it auto-commits updated CSV output.

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

Affiliate buttons automatically append URL parameters (UTM) in `app/config.js`.
Edit:
- `UTM_SOURCE`
- `UTM_MEDIUM`
- `UTM_CAMPAIGN`

If a URL already contains `utm_*`, the script will keep the existing values.


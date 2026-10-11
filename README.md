# EKY Directory

directory.everybodyknowsyou.com — a public directory of businesses, schools, startups and people,
country by country, built so people, search engines and AI assistants can read it.

## How data flows

Google Sheet (where the team types)  →  `scripts/import_sheet.py`  →  `data/entries/<country>/<id>.json` (source of truth, versioned here)
→  `scripts/build.mjs`  →  `dist/` (static pages EN/ES, JSON API, CSV, sitemap, llms.txt)  +  `db/seed-<country>.sql` (for D1)

- Curated extras for EKY clients: `data/profiles/<id>.json` (never overwritten by the import).
- Category definitions and URL slugs: `data/categories.json`. Slugs must never change once published.
- IDs are stable (`data/registry.json`), so entry URLs never change.

## URLs

- `/el-salvador/` country hub · `/el-salvador/tourism/` category · `/el-salvador/organizations/<id>/` · `/el-salvador/people/<id>/`
- Spanish under `/es/` with Spanish slugs (`/es/el-salvador/turismo/`, `/es/el-salvador/organizaciones/<id>/`).
- API: `/api/v1/index.json`, `/api/v1/<country>/entries.json`, `/api/v1/<country>/<category>.json`, `/api/v1/entries/<id>.json`, `/api/v1/search`
- MCP (Streamable HTTP, stateless, read-only): `/mcp` — tools `search_directory`, `get_entry`, `list_categories`
- Downloads: `/data/<country>.json`, `/data/<country>.csv` · OpenAPI: `/openapi.json`

## Rules built into the generator

- Only rows with Status Ready/Published are built (`--preview` also includes "To review" and noindexes everything).
- An entry page is indexable only with a description, at least one link and a source.
- A category is indexable only with 5+ indexable entries.
- People never get coordinates or addresses. Internal notes are stripped.

## Cloudflare Pages settings

- Build command: `node scripts/build.mjs` · Output directory: `dist` · Functions: `functions/` (auto)
- Optional bindings: `DB` (D1, database `eky-directory`), `METER` (KV, usage counts). Without `DB` the API reads the static JSON.

## Local

```
python3 scripts/import_sheet.py path/to/sheet.xlsx
node scripts/build.mjs --preview
npx wrangler pages dev dist
```

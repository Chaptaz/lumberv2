# Lumber Intelligence — Next.js

This directory contains the Next.js App Router rebuild of Lumber Intelligence. It preserves the Phase 1 workbook import, market dashboard, quote history, market and mill drill-downs, destination-scoped mill comparison, Command-K search, freshness settings, alias review, and additive backup/restore.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The health endpoint is available at `/api/health`.

## Verify

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

To run the additional real-workbook regression without copying the private XLSX into Git:

```bash
LUMBER_REFERENCE_WORKBOOK="/absolute/path/to/Lumber Quote Tracker.xlsx" npm test
```

## Data behavior

- Current intelligence uses the Mac/browser calendar date and configurable freshness thresholds.
- Blank, zero, `NQ`, unavailable, stale, or unresolved observations are never shown as current prices.
- Workbook imports are cumulative and fingerprinted. Raw workbook/sheet/row provenance is retained.
- Existing data is stored in browser local storage in this migration stage. Settings → Export backup produces a complete JSON backup; restore is additive and never overwrites existing quote records.

## Cloud-ready boundary

The App Router shell and health route make the project ready for Vercel. PostgreSQL, authentication, private workbook storage, and the one-time local-data migration are intentionally not connected yet; those require deployment credentials and a deliberate data migration. See [docs/architecture.md](docs/architecture.md).

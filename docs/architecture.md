# Lumber Intelligence — Next.js Architecture

## Current rebuild

- Next.js 16 App Router with a server-rendered root layout and client-only interactive application boundary.
- React/TypeScript UI preserving the verified Phase 1 screens and calculations.
- ExcelJS loaded only when a workbook is selected, keeping the normal dashboard path lighter.
- Browser-local append-only quote store, settings, import fingerprints, and additive JSON backup/restore.
- `/api/health` route for local and hosted health checks.
- Vitest regression coverage for freshness, normalization, workbook import, navigation, keyboard search, and non-destructive restore.

The current local store is an intentional compatibility stage. It avoids silently moving or deleting existing user data while the application changes frameworks.

## Recommended cloud target

1. Private GitHub repository runs lint, typecheck, test, and build checks.
2. Vercel deploys previews and the production Next.js application.
3. Managed PostgreSQL stores normalized entities and append-only quote observations.
4. Authentication protects all pricing, supplier, and contact information.
5. Private object storage retains original XLSX files and immutable file hashes.

## PostgreSQL boundary

Keep the existing domain rules independent of the persistence layer. Replace `lib/store.ts` with server-only repositories and route/server-action DTOs rather than allowing client components to query the database directly.

Core tables should include:

- `app_settings`
- `suppliers`, `supplier_aliases`
- `mills`, `mill_aliases`
- `contacts`
- `products`, `product_aliases`
- `grades`, `grade_aliases`
- `destinations`, `destination_aliases`
- `import_batches`, `import_sheets`, `import_records`
- `quotes`
- `activities`, `watchlist_items`, `capabilities`

Every imported quote must retain workbook name, sheet, row, raw values, import timestamp, exact fingerprint, normalized entities, and review issues. Imports remain cumulative; absence from a newer workbook never deletes history.

## Safe migration sequence

1. Export the complete browser-local JSON backup.
2. Create and migrate an empty PostgreSQL database.
3. Import source workbooks or the backup into a staging schema.
4. Reconcile record counts, exact fingerprints, latest quote date, unresolved rows, and mill aliases.
5. Promote only after reconciliation passes; retain the original local backup.
6. Add automated database backups and test a restore.

## Business invariants

- No price is carried forward to an unquoted date.
- Blank, `NQ`, unavailable, or non-positive prices are not `$0` quotes.
- Freshness uses the user's actual calendar date; future observations require review.
- Supplier, mill, and destination remain distinct entities.
- Delivered and FOB pricing bases never mix in a comparison.
- `#2` and `#2 Prime` remain separate products/grades.
- Current best uses only the latest comparable fresh/aging quote per mill.

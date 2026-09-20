# SANPACK Excel Price Manager handoff — 2026-09-20

## Status

Category-sheets schema v2 is a release candidate. The immutable production source/revision and smoke result are reported after the controlled automatic App Hosting rollout. No real Product price is changed by the smoke procedure.

## Production source / revision

- Verified source baseline before the category-sheets patch: `9ea16a86d5383396d460d43080915417b4965d1d` (`main`, equal to `origin/main`).
- Verified production health baseline: `sanpack-build-2026-09-20-003`.
- Release source: the Git checkpoint containing this handoff and the Price Manager implementation.
- Rollback target before rollout: `sanpack-build-2026-09-20-003`.

## Admin route

`/admin/prices` is visible only to `super_admin`. The shared capability is `pricing.write`; the page and every `/api/admin/prices*` route enforce it server-side. Other roles receive the existing Admin denial experience and cannot export, preview, apply or roll back prices.

## Excel schema

Schema v2 contains `Инструкция`, one visible sheet for every direct Product category that has rows, and a final `veryHidden` `_SANPACK_META` sheet. The former master sheet `Цены` is not duplicated. Each category sheet has the same styled table, category title, taxonomy breadcrumb, export date, frozen header, filters, locked read-only cells and highlighted editable new-price cells. The workbook contains no formulas in editable inputs and rejects macros, external links, embedded objects and oversized ZIP content on import.

Category sheets follow the existing Group → Category → Subcategory order. A Product is assigned only from its direct `categoryId`; parent categories do not receive descendant copies and categories without direct Products do not create empty sheets. Human sheet names are sanitized to Excel's 31-character/invalid-character rules and receive deterministic suffixes on collision.

## Product / Variant row semantics

- Product row: editable only when the current base Product price is a positive safe integer and the current effective mode is `fixed` or `from`.
- Variant row: editable only for an existing explicit positive Variant price whose effective mode is `fixed` or `from`.
- A Variant inheriting the Product price remains read-only; import cannot create a new override.
- `request` and `informational` prices remain read-only.
- Stable Product and Variant IDs, SKU and human-readable titles are carried for identity and operator review; SKU/title text is never used as the mutation key.

## Export manifest

Every workbook is paired with a server-side `priceExportManifests` document containing stable row identity, editable state, price/mode snapshots, expected direct category, expected sheet and integrity digests. It expires after 90 days. Import requires the matching unexpired manifest and validates the hidden workbook metadata, complete sheet map and every row against it. Sheet names are never used to find or mutate a Product.

## Import validation

The endpoint accepts only `.xlsx`, requires a bounded `Content-Length`, caps the file at 5 MB, 2,000 total price rows, 30 columns per data sheet, 64 worksheets and bounded decompressed ZIP content. It normalizes every approved category sheet into the existing canonical preview row set. It rejects renamed/missing/added category sheets, cross-category row movement, duplicate/missing/foreign rows, formula cells, non-integer or non-positive new prices, tampered protected context and unsupported workbook features. User strings are normalized and bounded; spreadsheet formula prefixes remain literal text. Still-valid schema v1 exports retain their legacy single-sheet parser path.

Upload is preview-only. It creates an audit batch but does not write `products`.

## Conflict handling

Preview re-reads the current target. If a price or price mode has changed since export, the row shows the export value, current SANPACK value and Excel value, marks a conflict and removes the apply action. Apply repeats the same checks inside the transaction, so a stale preview cannot race a later Product edit.

## Warning thresholds

Absolute changes above 30% are valid warnings, not silent blockers. The administrator must explicitly confirm that those rows were reviewed before apply. Errors and conflicts always block the whole batch.

## Apply transaction

Apply groups changes by Product and runs one Firestore transaction. It reads fresh documents, revalidates every target, patches only `Product.price` or the matching embedded `Variant.price`, preserves all unknown/unrelated fields and records the immutable before/after audit rows. Concurrent/replayed apply calls are idempotent and cannot count or write the batch twice.

## History

`priceImportBatches` records file, actor label, counts, status, warnings, changed rows and timestamps. Unchanged rows are summarized rather than copied into the long-lived audit document. The UI exposes previewed, applied, rolled-back and blocked states without Firestore document IDs.

## Rollback

Rollback previews the exact affected rows. It is allowed only when every current target still has the price written by that batch and its price mode is still editable. Any later price/mode change blocks the complete rollback; unrelated Product fields are never restored or overwritten.

## Security

Browser code never reads or writes Firestore directly. Admin SDK routes enforce revoked-session checks plus `pricing.write`. Payload, workbook structure and identity are server-validated. Responses are private/no-store. Firestore and Storage client rules remain deny-by-default; no rule relaxation is required.

## Firestore collections / TTL / indexes

- `priceExportManifests`: short-lived server export snapshots; `expiresAt` TTL, 90-day retention.
- `priceImportBatches`: bounded operational audit/history; no automatic destructive cleanup in v1.
- Existing Product documents: targeted transactional price patches only.
- `firestore.indexes.json` adds only the `priceExportManifests.expiresAt` TTL field override.

## Tests

- Unit/API/security: 563 passed, 20 skipped across 79 files (73 passed, six skipped). Category-sheet targeted coverage includes direct placement, taxonomy order, empty-parent exclusion, global identity uniqueness, sheet-name sanitization/collisions, multi-sheet edits, structural tampering and unchanged round-trip.
- Emulator: 32 Firestore boundary checks, seven Storage checks and 20 integration tests passed, including preview non-write, atomic multi-price apply, idempotency, unrelated-field preservation, stale/mode conflicts and rollback.
- Browser: Price Manager desktop/mobile tests cover export, preview, warning acknowledgement, explicit apply, no-change state, stale conflict, history, rollback preview, narrow layout and role denial. The full default suite produced 146 passes and four configured skips. The taxonomy suite produced 81 passes and one configured skip; two desktop fixture timeouts passed immediately when rerun against the same isolated production fixture.
- Typecheck, lint, production build and `git diff --check` passed.
- Production dependency audit contains the pre-existing Firebase/Google dependency advisory set: six moderate, zero high/critical; the added workbook dependencies introduce no remaining high/critical production advisory.

## Deployment

Use the normal push to `main` and the automatic App Hosting rollout. Do not run a duplicate manual application deploy. Apply the TTL policy only after a scoped read-only preflight. The immutable Git hash and App Hosting revision are recorded in the final release response after rollout.

## Production smoke

The safe smoke is: owner opens `/admin/prices`, downloads the real workbook, verifies category tabs and global identity counts, uploads that same unchanged workbook, verifies zero changes/warnings/conflicts/errors and confirms there is no apply action. No real price, request, notification, customer or catalog content is mutated.

## Known limitations

- Wholesale tiers are not editable.
- `priceMode` is not editable.
- Inherited Variant prices cannot be turned into explicit overrides.
- Product/Variant creation, deletion and publication are not supported.
- No Google Sheets synchronization or live collaborative editing.
- Rollback covers only price fields written by one batch and deliberately blocks on later price conflicts.

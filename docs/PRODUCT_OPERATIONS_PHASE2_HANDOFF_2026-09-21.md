# SANPACK Product Operations Phase 2 handoff — 2026-09-21

## Status

Product Operations Phase 2 is a release candidate. The checkpoint containing this handoff is deployed only after the recorded gate passes. Exact immutable Git source, App Hosting revision and production smoke are reported in the final release response after the automatic rollout.

## Source / revision

- Verified starting `main` and `origin/main`: `e2b1d0c227cf2088eb6448ae515e8736b30ee57e`.
- Verified starting production health: `sanpack-build-2026-09-21-001`.
- Release source: the Git checkpoint containing this handoff and the Product Operations implementation.
- Immediate rollback target before rollout: `sanpack-build-2026-09-21-001`.
- No catalog, taxonomy, price, request, customer, analytics or Telegram production data is migrated by this release.

## Product workspace

`/admin/products` is now a desktop-first operational table rather than a collection of large cards. It shows thumbnail, Product/SKU, direct category, canonical price presentation, availability, publication, Variant count, update time and bounded row actions. Fifty rows are rendered per page; search/filter/sort/page state is stored in the URL. Opening the full editor records the current scroll position and returns focus to the originating row.

The responsive layout keeps the Admin page itself inside its viewport and gives the wide data table a controlled internal horizontal scroll. The shared Admin header now remains vertically composed until enough post-sidebar width exists, preventing tablet text and actions from being squeezed off-screen.

## Search / filter / sort

Search covers localized Product names, Product SKU, Variant SKU and brand. Filters cover taxonomy scope, publication, availability, price mode, presence of Variants and concrete readiness issues. Shortcuts expose all, published, drafts and items requiring attention. Sorting supports recently changed, name, SKU, category and canonical effective price.

## Quick Edit

The right-side Quick Edit drawer contains only bounded frequent fields:

- category;
- brand;
- publication status;
- availability and optional stock quantity;
- existing `featured` and `newProduct` merchandising flags.

Price is read-only with a direct Price Manager link. Attributes, Variants, commerce/packaging rules, media, SEO and descriptions remain in the canonical Product Editor. `ownProduction` is deliberately not a Quick Edit field because it is a business claim, not a safe merchandising toggle.

Quick Edit calls one trusted server operation with an allowlisted strict schema. It uses the existing `catalog.write` capability, validates category lineage and publication readiness, updates only supplied fields, invalidates the Product cache and rejects stale `updatedAt` snapshots with a controlled conflict.

## Duplicate Product

Managers can create a draft from a row or choose an existing Product from the New Product dialog. The new document receives a new Product ID and collision-safe slug. Category, text, attributes, commerce rules, Variant structure and existing media references are copied as a starting point, while:

- publication is always `draft`;
- Product SKU is blank;
- every Variant gets a new ID and blank SKU;
- `featured` and `newProduct` are cleared;
- source Product and physical Storage objects are unchanged.

The new draft opens immediately in the canonical full Product Editor. Existing global Product/Variant SKU validation prevents saving duplicate catalog identities.

## Duplicate Variant

The existing Variant editor has a Duplicate action. It copies the Variant's attributes, price structure, quantity rules, packaging overrides, availability and image reference, while generating a new Variant ID and clearing SKU. It does not copy a Storage object or modify the source Variant.

## Bulk operations

Selection supports only the bounded v1 operations approved for this phase:

- move to another valid Product Category/Subcategory;
- publish;
- hide.

Each operation shows a preview and sends one request for at most 100 Products. Firestore transactions re-read every Product, validate optimistic timestamps and update the complete set atomically. Bulk publish is blocked if any Product is not ready. Moving published Products is also blocked if the target category introduces missing required data. Product IDs, URLs, prices and unrelated fields are preserved. No bulk delete, SKU, price, Variant, Attribute or packaging mutation was added.

## Product readiness

The workspace and editor expose concrete blockers/recommendations instead of an invented score. Blockers include missing Product/Variant SKU, duplicate Product/Variant SKU within the card, invalid category, missing effective fixed/from price and missing required Attributes. Recommendations include missing main image and selected localized content. Server checks remain authoritative for publication.

## Price Manager integration

`/admin/products` links directly to `/admin/prices` for mass price work. Quick Edit shows the current canonical price presentation but does not implement a second pricing editor. The Excel workflow, schema, preview/apply/history/rollback contracts and Product/Variant pricing semantics are unchanged.

## Security / concurrency

- Reads and writes continue through server APIs; no client Firestore access was introduced.
- `/api/admin/products/operations` requires a valid non-revoked Admin session plus `catalog.write`.
- The request union and every patch are strict and bounded; unknown fields are rejected.
- Quick Edit, duplicate and bulk operations use Firestore transactions and optimistic `updatedAt` checks.
- Bulk operations are all-or-nothing and reject duplicate target identities.
- Full Product Editor saves now use the same optimistic timestamp guard and global Product/Variant SKU uniqueness check.
- Existing deny-by-default Firestore/Storage rules are unchanged.

## Tests

- Full unit/API suite: **578 passed, 20 configured skips** across 81 files.
- Product Operations targeted suite: **85 passed** across readiness, list, API, concurrency and capability tests.
- Default browser suite: **152 passed, 4 configured skips** across desktop and mobile.
- Taxonomy/stabilization browser suite: **83 passed, 1 configured skip**.
- Firestore/Storage emulator: **32 Firestore boundary checks**, **7 Storage checks** and **20 integration tests** passed.
- Typecheck, lint, production build and `git diff --check`: passed.
- Visual self-review: 1440, 1280 and tablet; Quick Edit, filters, table containment and focus restoration verified.
- Production dependency audit: six moderate transitive Google/Firebase findings, zero high/critical. Full audit additionally reports the existing two high development-tooling findings. No dependency was changed by this phase.
- Release-diff secret scan: passed.

## Deployment

Use one normal checkpoint and push to `main`, allowing the configured automatic App Hosting rollout. Do not run an unscoped Firebase deploy. This release needs no Firestore/Storage rules, TTL, index, IAM or secret mutation.

## Production smoke

Safe smoke is read-only: open `/admin/products` as owner, verify list/search/filters, open and close Quick Edit, follow the Price Manager link, open an existing Product editor without saving and verify its storefront link. Duplicate and bulk mutations remain proven by unit/API/browser/emulator tests; no fake production Product is created and no real Product is modified merely for smoke.

## Known limitations

- Product bulk XLSX creation is not included.
- Wholesale Excel editing is not included.
- Google Sheets synchronization is not included.
- ERP/warehouse/reservation workflows are not included.
- Bulk Product delete is not included.
- Product Operations is desktop-first; narrow Admin keeps core actions and controlled table scrolling rather than introducing a separate mobile CMS.


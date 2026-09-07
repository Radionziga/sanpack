# SANPACK release-candidate stabilization — handoff

Date: **2026-09-07**
Baseline HEAD: `a7461c520025c8a502f46c756bc8131921ffc2e8`
Scope: close independent-review findings F01–F17 in the accumulated Admin/SEO working tree. No product-scope expansion, production write, deploy, push or taxonomy mapping.

## Executive status

**READY FOR CONTROLLED DEPLOY AFTER CHECKPOINT REVIEW.**

The existing catalog/commerce/security architecture was retained. Stabilization connected previously partial behavior end-to-end, hardened mutation/order boundaries and made the server-rendered storefront, Admin permissions and browser state deterministic. No Firestore schema migration or content backfill is required.

## Findings closed

| ID | Severity | Area | Resolution |
| --- | --- | --- | --- |
| F01 | P0 | Runtime/static generation | Locale storefront is explicitly dynamic; server repository caching remains tagged and bounded. E2E fixture builds without cloud reads and enables seed only at runtime. |
| F02 | P0 | Release integrity | Duplicate catalog metadata/import and duplicate test blocks removed; exact-tree build/test now clean. |
| F03 | P0 | Admin round-trip writes | Typed mutation builders strip document identity/audit fields while preserving supported nested Product/Category/Attribute/Client/Banner/Settings data. |
| F04 | P1 | Product crawlability/payload | Product route is server-first and renders essential content/JSON-LD; client receives current Product, definitions and at most four related Products instead of the full catalog. |
| F05 | P1 | Catalog navigation state | Sort, view, stock, own-production and typed filters serialize into query state and restore through browser Back/Forward. |
| F06 | P1 | Mobile overlap | Floating contact is suppressed on routes with critical sticky controls: Product, request, bag designer and catalog print. |
| F07 | P1 | Global links | Footer no longer carries stale hardcoded taxonomy links; E2E verifies global navigation destinations. |
| F08 | P0 | Commercial price UX | Desktop/mobile quantity controls and totals use selected Product/Variant canonical sale/wholesale price; request/informational products cannot leak stale numeric price offers. |
| F09 | P1 | Order concurrency | Admin order mutations require `expectedRevision`; Firestore transaction detects conflict (409) and writes audit atomically. |
| F10 | P1 | Request idempotency | Browser supplies a bounded idempotency key; server hashes intent and transactionally replays identical requests without duplicate notification, while conflicting reuse returns 409. |
| F11 | P1 | Admin dialog lifecycle | Product/Category/Attribute flows protect dirty edits, trap/restore focus, label controls, disable duplicate save and surface errors. |
| F12 | P1 | Admin roles | Shared capability matrix gates navigation and handlers: content managers edit catalog, sales manage orders, super admin has full access, viewer is read-only. |
| F13 | P1 | Stale cart | Checkout re-reads public Products and reconciles price, variant, quantity and availability; changed cart is shown for review before submission. |
| F14 | P1 | Locale navigation | Locale changes preserve query string and hash, including catalog state. |
| F15 | P1 | Customer order privacy/query | Explicit customer DTO excludes internal/admin/Telegram/Product snapshots; server query is bounded and backed by a declared composite index. |
| F16 | P1 | Favorites reliability | Loading/error/retry states no longer present read failures as a false empty list; stale async completion is cancelled. |
| F17 | P1 | Media usage safety | Reference scanner covers main/gallery/variant/document assets and SiteSettings logo/dark-logo paths before deletion. |

## Architecture and runtime behavior

- Catalog query state source: `lib/catalog/catalogQueryState.ts`; locale-preserving navigation: `lib/i18n/localeNavigation.ts`.
- Product route fetches only the current public Product, taxonomy/Attribute context and a bounded related set. Essential visible content and structured data are present before hydration.
- Commerce source of truth remains `lib/commerce/productOffer.ts`; comparison pricing never becomes cart/order price.
- Request submission remains a server-canonical calculation. Idempotency prevents accidental duplicate rows/notifications without weakening validation.
- Cart reconciliation is an explicit review gate, not silent price acceptance.
- Firestore direct-client deny-all and trusted public projection are unchanged.

## Admin behavior

- AdminRepository sends mutation-safe DTOs rather than spreading Firestore documents back into writes.
- Catalog/product/order capabilities are checked both in navigation and server endpoints.
- Optimistic order revision prevents two operators silently overwriting each other.
- Dialogs and unsaved-change prompts are keyboard/focus safe; existing legacy Attribute values remain preserved.

## Data model / compatibility

- No required Product/Category migration and no taxonomy/content rewrite.
- Request idempotency documents and order revision are additive operational state.
- `firestore.indexes.json` declares the bounded customer-order query index.
- Existing Product/Variant/price/quantity semantics remain backward compatible.

## Validation

The exact source was validated in a non-iCloud mirror because macOS FileProvider placeholders made the original workspace intermittently block reads; the mirror was synchronized byte-for-byte before each gate.

- Clean `npm ci`: 1,265 packages installed.
- `npm ls --depth=0`: passed.
- `npm test`: **53 files, 399 tests passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Production-mode `npm run build` with non-secret placeholder public Firebase build config and `SANPACK_USE_SEED_DATA=false`: passed; 90 routes generated and storefront routes remained dynamic.
- `npm run test:e2e`: **28 passed** across desktop and iPhone-sized Chromium using deterministic production build/start fixture.
- `npx playwright test --config=playwright.taxonomy.config.ts`: **69 passed, 1 expected mobile skip**.
- `npm audit`: 17 advisories (15 moderate, 2 high); both high findings are confined to development tooling dependency chains.
- `npm audit --omit=dev`: 6 moderate transitive advisories, **0 high, 0 critical**.
- Secret-signature scan: no private key, service-account credential or known token signature in the checkpoint diff.
- `git diff --check`: passed on the final exact tree.

## Production and migrations

- Production writes: **NO**.
- Firestore migrations/backfills: **NO**.
- Taxonomy mapping: **NO**.
- Deploy: **NO**.
- Push: **NO**.

Production remains on the prior documented live foundation until this release candidate receives independent review and a separately authorized controlled deploy.

## Deliberately not changed

Contextual facet counts, public search indexing of attributes, Brand CMS/pages, collections/tags, payments, inventory reservation, arbitrary taxonomy, full ZH cleanup, analytics providers, mass catalog/content rewrite and production taxonomy mapping remain outside this stage.

## Remaining limitations / risks

- Structured Product data is a product-level Offer, not a per-Variant inventory feed.
- Full-collection public catalog projection/client filtering is suitable for the current scale, not an unlimited search architecture.
- Slug history/automatic redirects, contextual facet counts and search attribute indexing remain future work.
- Mobile Chromium emulation is not a physical Safari/device test.
- A controlled deploy must re-run live health/storefront/Admin/order/media smoke without modifying catalog content.

## Git / next step

One local checkpoint was created with message `fix: stabilize admin seo release candidate`; the exact hash is the commit containing this document. Working tree was clean after checkpoint. No push or deploy was performed. Next: independent checkpoint review, then a separately authorized controlled deploy.

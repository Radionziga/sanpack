# ADMIN PANEL OPERATIONAL UX + SEO ARCHITECTURE/CMS — HANDOFF

Date: **2026-09-05**
Scope: local code/UI/metadata foundation only. No deploy, push, production content write, taxonomy mapping or migration.

> **Superseded for current release-candidate state:** последующая stabilization закрыла documented crawlability limitation, URL-state и связанные adversarial findings. Актуальный итог и validation находятся в [STABILIZATION_HANDOFF_2026-09-07.md](STABILIZATION_HANDOFF_2026-09-07.md). Этот документ сохраняет исходный Admin/SEO audit snapshot.

## Executive summary

The production Admin was audited read-only as a catalog manager against 238 Products, 27 taxonomy nodes and 252 media objects. The existing editors, variant definitions, media library, bounded taxonomy and SiteSettings SEO model were kept. P1 operational friction was addressed without a second CMS or SEO engine: the Product list is workable at current scale; Attribute keys can no longer silently orphan stored values; Product/Category SEO editing exposes actual fallbacks and canonical previews; indexable routes now share one metadata policy and structured breadcrumbs.

The code is ready for independent review, not deployment. Existing production remains on `39c1ceaec4e9d2e9a7a27e6e080e1dd9be1373b9` / `sanpack-build-2026-09-04-002`.

## Admin audit

| Area | Initial problem | Severity | Fixed | Remaining |
| --- | --- | --- | --- | --- |
| Product list | Search only RU name/SKU; no filters/sort/paging; raw Product price; ambiguous taxonomy/status | P1 | Search includes localized names, Product/Variant SKU and brand; taxonomy/status/availability filters; sort; 50/page; full path, publication, variant count, effective price | No bulk actions; deliberate backlog |
| Product Editor | Long form, accidental Escape/cancel loss, weak success/error navigation | P1 | Section anchors, dirty confirmation/beforeunload, success status, save error scroll, slug warning | Still a large modal; no autosave |
| Category tree | Good bounded tree but no catalog scope count | P1 | Counts use shared category scope semantics | No drag-and-drop; parent + sort remains intentional |
| Attributes | Existing key editable; changing it could orphan Product/Variant values | P0 operational integrity | New key auto-suggested; advanced override before first save; immutable in UI and API | Intentional key migration would require a dedicated migration tool |
| Variants | Dense but uses definitions correctly | — | Not redesigned | Large variant sets may need later accordion/table UX |
| Media | 252 assets, usage/search/filter already adequate | — | Not changed | No DAM/bulk delete added |
| SEO editor | Eight fields with no fallback/canonical/length context | P1 | Localized editor, advisory counts, fallback and SERP/canonical preview | Preview cannot guarantee Google presentation |
| Static route SEO | Content pages inherited homepage metadata | P1 | Route-specific localized metadata for catalog and seven content/legal routes | Copy remains code/content-layer, not a full page CMS |
| Product crawlable body | Metadata/JSON-LD SSR, body fetched after hydration | P2/risk | Закрыто последующей stabilization: bounded server-first Product route | Интерактивные variant/cart controls остаются client-side |

## Operational workflows

Production was inspected read-only using the authenticated owner session. No Save, upload, delete, order or taxonomy write was performed.

- A Product can be found by name/SKU today; the new local implementation additionally supports brand and Variant SKU, filters and pagination.
- Existing editor exposes publication, category path, SKU/brand, pricing, stock, variants, media, attributes, order rules, wholesale tiers, comparison pricing, SEO, documents and relations.
- CMS Attribute definitions already drive Product and Variant editors; unknown legacy values are preserved.
- Complex Product creation remains one existing Product/Variant model. No options/variant engine was introduced.
- Category/Subcategory creation and moves continue through the existing bounded placement validation.

## Product list

`lib/admin/productList.ts` is the testable source for list filtering/sorting. Category filters include descendants through `getCategoryScopeIds`; price sorting uses `getEffectiveCatalogPrice`, matching storefront preview semantics. Availability checks Variant stock when variants exist. UI pages client-side in groups of 50, appropriate for the current 238 records without an enterprise grid.

## Product Editor

The domain form was not split into competing state stores. Compact anchors provide navigation to core sections. The editor records a baseline on open, warns before destructive close/browser navigation, retains explicit Save, disables duplicate submission, reports success, and scrolls server/validation failures into view. Existing slug changes display an SEO impact warning; redirect history was not added.

## Categories/Subcategories

The existing `Group → Category → optional Subcategory` tree remains unchanged. Each node now shows Products in its complete storefront scope, so Group/Category counts include descendants and Subcategory counts remain direct. The SEO editor derives the nested canonical path from current lineage.

## Attributes

Internal key is now treated as a stable relation identifier. For a new Attribute it is transliterated from RU title and can be overridden before first save. Existing keys are disabled in Admin, and the API compares against the stored document and returns conflict on change. Labels/options/applicability remain editable and existing keys require no backfill.

## Variants

`ProductVariantsEditor` was audited and left intact: it uses applicable CMS definitions, typed values, SKU, variant price/stock/quantity/unitPricing/image and retains legacy keys. No second options engine was created.

## Media

Media Library already provides upload, preview, search, type/usage filters, sorting and usage-aware delete protection. Public/private Storage architecture was not revisited. No production upload/delete occurred.

## SEO architecture

| Route type | Index policy | Canonical/hreflang | Metadata / structured data |
| --- | --- | --- | --- |
| Home | index | localized root + x-default RU | SiteSettings fallback, OG/Twitter, Organization/WebSite |
| Catalog | index | localized `/catalog` | dedicated localized title/description |
| Group/Category | active only | flat canonical | entity SEO fallback, image OG, BreadcrumbList |
| Subcategory | active lineage only | nested Category/Subcategory | same entity policy, lineage BreadcrumbList |
| Product | published only | localized Product URL | entity fallback, Product/Offer + BreadcrumbList |
| About/Clients/Delivery/Branding/Contacts/Privacy/Terms | index | localized route | dedicated localized title/description/OG |
| Search/Favorites/Request/Orders/Profile/Print | noindex/nofollow | not sitemap content | response header; robots disallow for discovery |
| Admin/API | noindex/private | none | admin layout/header policy and robots disallow |

Faceted combinations are not an indexable URL contract. No indexed filter-page generator was added.

## SEO data model

No schema change. Existing optional `Product.seo` and `Category.seo` fields remain explicit localized overrides; `SiteSettings.seo` and company identity provide global fallback. Published/active status remains indexability source of truth, so a new noindex field was not justified in this stage.

Fallback order is: explicit localized entity SEO → localized entity title/short description/description → localized SiteSettings description. Generated entity titles receive company identity; explicit SEO titles are respected verbatim.

## Product SEO

Product metadata now uses the shared policy for title/description/canonical/hreflang/OG/Twitter. Product image is the social image. Product JSON-LD continues to use minimum sale price, never comparison price; main image is included even when not duplicated in `images`. BreadcrumbList follows visible Home/Catalog/Category/Subcategory/Product lineage.

Known limitation: Offer availability remains product-level rather than a full per-Variant offer feed, matching the previous documented semantics.

## Category/Subcategory SEO

Entity SEO override, localized fallback, canonical, all four alternates plus x-default, social image and BreadcrumbList share the actual route resolver/lineage. Invalid or hidden lineage remains fail-closed/noindex/404 through existing routing.

## robots.txt

Storefront locale roots remain allowed. Admin and API remain disallowed. Search, favorites, request, orders, profile and print paths for all four locales were added to crawler discovery exclusions. Security does not rely on robots.

## sitemap

No algorithm change was required. Production read-only audit found 1,100 unique URLs: 4 home, 4 catalog, 32 static, 108 taxonomy and 952 Product URLs; no duplicates. Implementation still projects active taxonomy and published Products only and excludes utility/admin/API routes.

## Structured data

- Locale layout: `Organization` and `WebSite`.
- Product: existing `Product`/single `Offer`, plus new `BreadcrumbList`.
- Category/Subcategory: `BreadcrumbList` aligned to visible navigation.
- No speculative category schema or extra schema types were added.

## SEO Admin UX

Product and Category reuse `SeoFieldsEditor`: RU/UZ/EN/ZH tabs, explicit override fields, advisory character counts, fallback preview, canonical URL and Google-like result preview. Empty overrides stay empty in persistence; generated values are presentation only. Existing slug edits show a warning.

## Production read-only SEO audit

Checked production HTTP/head output before local changes:

- Home had correct title/description/canonical/hreflang but no site JSON-LD.
- `/ru/catalog` inherited generic homepage metadata and lacked canonical/hreflang.
- sampled Category had correct localized metadata/canonical/hreflang.
- sampled Product had metadata and Product JSON-LD but raw initial body did not contain visible Product H1.
- About, Clients, Delivery, Branding, Contacts, Privacy and Terms inherited generic homepage metadata.
- utility routes returned `X-Robots-Tag: noindex, nofollow`; admin/API boundaries were noindex.
- `robots.txt` and `sitemap.xml` returned 200.

These were read-only checks. Local fixes are not deployed.

## Tests / validation

- New unit coverage: Admin Product search/scope/status/stock/effective-price sort; immutable Attribute key API; SEO fallback/canonical/hreflang/static route/Breadcrumb/robots behavior.
- New browser coverage: static content metadata, Product canonical/Product+Breadcrumb JSON-LD, nested Subcategory canonical.
- Taxonomy fixture launcher now skips an optional missing source directory instead of aborting before tests.
- Финальная stabilization gate: `npm test` — 53 files, 399 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed after removing effect-driven derived state.
- `npm run build`: first run failed fail-closed because the restored workspace has no ignored `.env.local`; rerun with non-secret seed/dummy public Firebase build values passed, 90 routes.
- `npm run test:e2e`: 28 passed in production-mode desktop/mobile fixture.
- taxonomy E2E: 69 passed, 1 intentional mobile-only navigation skip.
- `git diff --check`: passed.
- After the workspace rematerialized on 2026-09-06, a final targeted rerun was attempted. macOS placeholder materialization stalled `next typegen`/TypeScript and prevented Vitest fork workers from starting; that rerun produced no test results and was stopped. The complete successful gate above was executed against the same deterministically replayed patch set before the filesystem rematerialization. A fresh independent-review environment should rerun the gate once more before checkpointing.

## Data / migrations

- Production writes: **NO**.
- Taxonomy mapping: **NO**.
- Destructive migration: **NO**.
- Firestore schema migration/backfill required: **NO**.
- Deploy/push: **NO**.

## Not changed

Contextual facets, public search attribute indexing, Brand CMS/pages, collections/tags, payments, inventory reservation, arbitrary taxonomy, Storage/Firebase architecture, ZH content cleanup, analytics providers and mass content rewrite were not touched. Filter URL state was added during subsequent stabilization. Bulk operations remain backlog pending concrete safe workflows.

## Remaining limitations

1. Structured Product Offer is not a per-Variant inventory feed.
2. Slug changes have warnings but no redirect history.
3. Static marketing/legal SEO copy is code content, not a full page CMS.
4. Large Variant sets and relation selection may eventually need richer paging/accordion UX; current search addresses the immediate 238-Product friction.
5. No safe production test-order/Telegram suppression workflow exists.

## Workspace recovery note

During this local task the workspace directory temporarily disappeared from the filesystem without a destructive command from the agent. A working copy was reconstructed from the official origin and the exact in-progress patches preserved in the Codex session log. The local filesystem later rematerialized the original repository at its real docs-only checkpoint `a7461c5…`; the reviewed Admin/SEO patch set was then replayed deterministically. Existing ignored `.env.local` remained local and was neither read into documentation nor committed.

## Git state

Branch: `main`. HEAD: `a7461c520025c8a502f46c756bc8131921ffc2e8` (local docs-only rollout checkpoint, one commit ahead of `origin/main`). Admin/SEO implementation is uncommitted. No new commit/push/deploy was made.

## Recommended next step

1. Independent review of this accumulated diff, including the recovered documentation baseline.
2. One checkpoint commit after review.
3. Controlled deploy of Admin/SEO code with read-only SEO smoke and authenticated Admin smoke.
4. Separate SANPACK taxonomy/catalog/content cleanup.
5. Separate GA4/Search Console/Yandex Metrica/Webmaster integration.

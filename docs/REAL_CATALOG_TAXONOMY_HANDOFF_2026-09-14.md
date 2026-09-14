# SANPACK real catalog & taxonomy handoff — 2026-09-14

## Status

Production content migration is complete and verified. Runtime rollout evidence is recorded below after the application checkpoint receives traffic.

## Production baseline

- Project: `stamply-4df8a`.
- Application source at inventory/apply: `329b75e556e51704a5d3c24ecb0505ae7526aeab`.
- App Hosting revision at inventory/apply: `sanpack-build-2026-09-13-005`, 100% traffic.
- Inventory: 238 Products, all published; 27 taxonomy documents (2 Groups + 25 Categories); 16 Attribute definitions; 25 Variants.
- Commercial modes: 139 fixed-price Products and 99 request-price Products.
- Runtime, Firestore/Storage rules, IAM, secrets, customer identity, orders and analytics storage were not changed by the content operation.

## Inventory

The inventory was read directly from production Firestore and the public server projection. For every Product the migration considered ID, SKU, localized title, brand, current placement, publication, price mode, Variants, Attributes, media, SEO/content and merchandising fields. The taxonomy inventory included lineage, status, direct/scope counts, artwork and Home curation; Attribute usage was counted against actual Product values.

Pre-apply integrity was clean: 238/238 published Products had a visible valid lineage, with no missing parents, cycles, duplicate slugs, orphan Products, categorySlug drift, unknown Attribute references or invalid values. Fixed price without a price, request-price with stale numeric price, informational order lines and quantity/packaging contradictions were all zero.

## Target taxonomy

The domain model remains exactly `Group → Category → optional Subcategory → Product`. Four broad commercial Categories were added while all existing IDs and slugs were preserved:

| Group | New Category | Existing Subcategories | Products | Rationale |
| --- | --- | --- | ---: | --- |
| Упаковка и расходные материалы | Пакеты и мешки | Мусорные пакеты; Отрывные пакеты; Пакеты «Майка»; Вакуумные пакеты и пакеты для пиццы | 19 | One buyer-recognizable family for bags without flattening distinct purchase uses. |
| Продукты питания | Мясо, птица и яйца | Говядина; Курица; Куриные яйца | 22 | A compact protein branch for professional kitchens. |
| Продукты питания | Бакалея и ингредиенты | Мука; Сахар; Крупы и бобовые; Растительные и фритюрные масла; Соль; Дрожжи и ингредиенты для выпечки; Томатные пасты и соусы | 33 | Groups stable pantry/production ingredients without one-Product nodes. |
| Продукты питания | Овощи, фрукты и зелень | Фрукты; Ягоды; Овощи; Салаты, зелень и пряные травы; Микрозелень | 131 | Matches fresh-produce procurement and keeps useful leaf comparisons. |

All four new nodes have explicit RU/UZ/EN/ZH titles/descriptions and independent navigation/card artwork. They are not added to the curated Home bento set; existing featured child cards and their ordering remain Admin-controlled. `Салаты, зелень и пряные травы` and `Бумажная продукция и салфетки` labels were clarified without changing IDs/slugs.

## Mapping counts

- Products mapped: 238; Product IDs and SKUs preserved: 238/238.
- Product `categoryId` moves: 0; the same 19 leaf IDs were reparented instead.
- Taxonomy documents: 27 → 31; new Categories: 4; existing Categories updated: 20.
- Orphans, invalid lineage, depth > 2, cycles, duplicate slugs and hidden published lineages: 0.

The full reviewable/repeatable artifact is [production-taxonomy-map-2026-09.json](catalog/production-taxonomy-map-2026-09.json). Its pre-apply digest is `42079b8271d096dcbb385213175a2710c329e71cba06c628fa070c8d4e5dc339`; the verified target digest is `4e2808171d14a5bb83c767c295a0f830ea309203ee72b5d554ec953626f0482d`.

## Ambiguous/manual-review Products

No ambiguity was guessed or made a migration blocker. Four SKUs remain safely in `Крупы и бобовые` pending a broader dried-fruit/seed/spice assortment decision: `SP-GR-013`, `SP-GR-014`, `SP-GR-015`, `SP-GR-016`. Supplier-specific beef cut names `Ташки сон`, `Чарви` and `Сарпанжа` remain unchanged pending authoritative business wording.

## Attributes and filters

All 16 definitions and Product values were preserved. No legacy key was deleted and applicability remains inherited through the lineage engine. The storefront suppresses a non-actionable one-value option/range facet unless already active; useful multi-value, boolean and active filters remain visible. This avoids a single value pretending to offer a choice without introducing a new faceting system.

## Media and content quality

- Public main images after apply: 238/238; distinct main-image URLs: 229.
- 223 distinct referenced media URLs were checked; broken responses: 0.
- Six legacy Products whose storefront image came only from the compatibility map now store that same existing asset explicitly as `mainImage`/`imagePaths`; no generated media was introduced.
- Seven exact duplicate-image groups remain review candidates only; nothing was deleted or reassigned without an authoritative alternative.
- No price, tier, quantity/packaging rule, `ownProduction`, publication state or business claim changed.
- No mass ALL CAPS/duplicate-title defect was found; all published Products have RU descriptions.
- Existing fallback remains for 21 Category and 157 Product ZH gaps; no bulk machine copy was invented.

## SEO and routes

Existing Product IDs, Product URLs and all existing slugs remain intact. A moved leaf now has the canonical nested path, e.g. `/ru/catalog/ovoshchi-frukty-zelen/frukty`; its historical flat path remains a compatibility entry with the existing permanent Next redirect signal and canonical metadata. Invalid parent/child combinations remain 404.

Sitemap composition is fully explained: before 1,104 URLs = 108 taxonomy + 952 Product + 44 static; after 1,120 = 124 taxonomy + 952 Product + 44 static. The +16 is exactly four new pages × four locales. Flat aliases are not in the sitemap and no Product URL disappeared. Canonical, hreflang, BreadcrumbList and Product breadcrumb hard-GETs were verified.

## Dry-run, backup and production apply

The final pre-apply dry-run reported 238 Products before/after, 4 creates, 20 category updates, 19 reparented nodes, 6 explicit media repairs and zero blockers. One atomic Firestore batch used document update-time preconditions and targeted patches only.

Immediately before writing, the exact 30 affected documents were exported to a private mode-0600 rollback snapshot:

`/private/tmp/sanpack-production-backups/real-catalog-taxonomy-2026-09-14T03-03-34-454Z.json`

It contains no settings, secrets, customers or requests and stays outside Git. The post-apply reread produced zero remaining operations. Content rollback, only for a proven taxonomy incident, is deterministic:

`node --env-file=.env.local scripts/real-catalog-taxonomy-2026.mjs --rollback=<backup-path> --project=stamply-4df8a`

Application rollback and content rollback are independent.

## Verification

- Public API: 31 categories, 238 Products, 16 Attributes, 238/238 main images, 0 orphan Products.
- Storefront: Home curation/order retained; new parent shelves/routes and compact Subcategory chips resolve; bounded Catalog/Load More remain intact.
- Mobile: Home, parent Category, nested Subcategory and Product visually checked at 320/390/430/360 px; images, labels, filters, sticky navigation and CTA remain usable.
- Search: exact Variant SKU `SP-FP-005-800` resolves; a related patch makes parent-category names match descendants through the existing lineage helper.
- Admin: `/admin/categories` shows 31 nodes with scope counts, type, Home visibility/order and separate navigation/Home artwork. Product/Attribute editors retain current controls.
- Analytics: Product IDs stayed unchanged, history was not rewritten, and future category reporting receives the new hierarchy; `/admin/analytics` remains operational.
- Requests/history: no snapshot/Product record was replaced; no Request/customer data was written.

## Tests

- unit: 68 passed files / 5 skipped; 505 passed / 17 skipped; targeted catalog/search: 27/27;
- typecheck, ESLint and production build (96 routes): passed;
- default Playwright: 134 passed / 4 skipped;
- taxonomy Playwright: 83 passed / 1 skipped;
- stabilization Playwright: 42 passed; analytics Playwright: 12 passed;
- Firestore/Storage boundary checks: 28 + 7 passed; emulator integration: 5 files / 17 tests passed;
- `git diff --check` and release-diff secret scan: passed;
- production dependency audit: 0 high/critical; 6 moderate transitive `uuid` advisories through Firebase/Google Storage tooling, with no safe isolated fix in this content release.

The final lineage patch is included in these results.

## Production rollout and monitoring

Taxonomy checkpoint: `e43bcdf701dd7abf1d76e5f0ad40ca9174323882` (`feat: organize production catalog taxonomy`). The final lineage-search source/revision and 100% traffic evidence are appended after automatic App Hosting rollout. No rules, IAM, secrets, indexes, TTL, catalog prices, customers, orders or Telegram notifications are part of it.

## Remaining content backlog

1. Owner confirmation for the four ambiguous grocery SKUs and supplier-specific beef-cut wording.
2. Authoritative ZH copy where existing fallback is not commercially sufficient.
3. Review exact duplicate images only when a correct alternative asset is available.

These do not invalidate the production taxonomy and should not trigger another architecture/security audit.

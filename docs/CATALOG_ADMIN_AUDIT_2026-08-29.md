# SANPACK catalog CMS audit — 2026-08-29

## Scope and result

The audit covers the public catalogue, home/category navigation, product cards and pages, PDF catalogue, Firestore repositories, seed compatibility, media fields, admin APIs, and the category/product/attribute editors.

The target model is now:

`Group → Category → Product → Variant`, with category-aware `Attribute` definitions.

Groups and categories use the same Firestore `categories` collection. A group has no `parentId`; a sellable category has `parentId` pointing to a group. Products may only point to a sellable category.

## Feature-to-data map

| Storefront feature | Canonical data | Admin control | Current state |
| --- | --- | --- | --- |
| Catalogue groups | `categories.parentId = null`, localized titles, status/order | Categories editor | Managed; no code change needed for a third group |
| Categories inside groups | `categories.parentId`, status/order | Categories editor | Managed; moving a category changes its group |
| Compact navigation art | `navigationImage`, `navigationImagePath` | Categories editor | Managed; legacy `image` remains a read fallback |
| Bento/category cover | `cardImage`, `cardImagePath` | Categories editor | Managed; `banner`/legacy artwork remain fallbacks |
| Category storefront showcase | `featured`, `featuredSortOrder` | Categories editor | Managed; ordered categories are fallback when no explicit featured set exists |
| Category SEO | `category.seo` RU/UZ/EN/ZH | Categories editor | Managed |
| Product category/group | `product.categoryId`; group derived through category | Product editor | Managed; direct assignment to a group is rejected |
| Publication | `product.status` | Product editor | Managed; new records default to draft |
| Product identity | SKU, slug, localized titles/descriptions, brand | Product editor | Managed; slug is generated safely when omitted and uniqueness is checked |
| Product media | main image, gallery and Storage paths | Product editor/media API | Managed |
| Price and availability | price/old price, mode, currency, visibility, stock state/count | Product editor | Managed |
| Quantity model | sales unit, unit code, min/max/step, catch weight, packaging | Product editor | Managed as separate concepts |
| Wholesale tiers | product and variant tiers | Product/variant editors | Managed |
| Variants | localized label, SKU, price, availability, quantity and image | Variant editor | Managed |
| Characteristics | `attributes` definitions + `product.attributes` values | Attribute/Product editors | Category-aware and managed |
| Dynamic filters | filterable applicable attributes | Storefront derived from Firestore | Managed; multiselect and exact matching corrected |
| Card highlights | `attribute.cardVisible` | Attribute editor | Storefront now consumes it |
| Product specifications | `attribute.productVisible` | Attribute editor | Product page and PDF now consume it |
| Related/accessory products | ID arrays | Product editor | Managed; explicit relations precede same-category fallback |
| Documents | localized document records | Product editor | Managed |
| Product SEO | `product.seo` RU/UZ/EN/ZH | Product editor | Managed |
| Product ordering/highlights | `sortOrder`, `featured`, `newProduct`, `ownProduction` | Product editor | Managed and used |

## Gaps found and corrected

- Storefront category groups and the fixed list of twelve showcase categories were code-bound. The storefront now derives all groups and category sets from Firestore.
- Compact and large category artwork had no explicit separate CMS fields. The data model, validator, Storage presets, admin editor, and storefront now distinguish navigation and card artwork.
- Attribute category assignments, required state, and order existed partially in state but were not controllable. They are exposed in the admin UI.
- The product editor previously showed every attribute. It now shows universal attributes plus attributes assigned to the selected category or any ancestor group.
- Required characteristics are now enforced both in the editor and by the admin API when publishing.
- Category and attribute deletion now has referential-integrity guards.
- Product category slugs are synchronized server-side; category, product slug, and SKU uniqueness are validated.
- Product mutations now replace complete catalogue documents instead of merging stale optional fields. Global settings retain merge semantics.
- Product fields used by storefront but missing from admin are exposed: publication, brand, price modes, old price, tiers, currency, stock, quantity semantics, packaging, relations, documents, SEO, ordering and flags.
- Filters now handle array values correctly and use exact value matching rather than substring matching.
- Chinese product text participates in search.
- Product page and PDF characteristics now use the same attribute presentation pipeline instead of separate hardcoded specification lists.

## Compatibility rules

- Existing `Category.image/imagePath` is retained. It is a fallback for `navigationImage/navigationImagePath`.
- Existing `Category.banner` and the legacy artwork map remain read fallbacks for `cardImage`; they are no longer the source of group/category structure.
- An attribute with no `categoryIds` is universal.
- Assigning an attribute to a group makes it available to all descendant categories.
- `Category.attributeIds` is retained for document compatibility, but `Attribute.categoryIds` is the canonical assignment direction.
- Seed mode remains available and seed records include the new image/showcase metadata.
- Existing product attribute values that become inapplicable after a category change are preserved and visibly flagged in the editor rather than silently deleted.

## Firestore verification and migration

Run the read-only field/integrity audit:

```bash
npm run catalog:audit
```

Preview deterministic backfills (default is dry-run):

```bash
npm run catalog:migrate:dry-run
```

The migration can only write when both explicit switches are supplied:

```bash
node --env-file=.env.local scripts/migrate-catalog-cms.mjs --apply --project=stamply-4df8a
```

It only backfills deterministic compatibility fields and synchronized `categorySlug` values. It does not delete documents, invent translations, publish drafts, or overwrite an already configured new field.

During this audit the live read was attempted but Application Default Credentials returned `invalid_grant` / `invalid_rapt`. No Firestore writes were attempted. Reauthenticate ADC before running the read-only audit or migration.

## Remaining intentional boundaries

- Brand is currently a product field, not a separate Brand CMS collection. A Brand entity should only be introduced when storefront needs brand pages, brand-level media/SEO, or governed brand reuse.
- Attribute units remain a localized-neutral symbol/string such as `%`, `kg`, or `mm`. If long localized unit labels become necessary, add a dedicated Unit dictionary rather than duplicating labels in products.
- Legacy seed/local artwork remains as a resilience fallback until real Firestore documents have been audited and backfilled.
- Migration `--apply`, production writes, deployment, and push require a separate explicit operational step.

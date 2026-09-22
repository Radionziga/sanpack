# SEO by default

SANPACK derives technical SEO from public domain data. Product and Category documents do not need generated metadata persisted in Firestore.

## Entity pages

Use the shared policy in `lib/seo/policy.ts`:

- `buildProductMetadata(product, locale, settings, categories)` for Product routes;
- `buildCategoryMetadata(category, locale, settings, categories)` for taxonomy routes;
- `buildContentMetadata(...)` for another intentional public content route;
- `buildProductImageAlt(...)` for Product and Variant image fallbacks;
- `buildProductStructuredData(...)` and `buildBreadcrumbStructuredData(...)` for truthful JSON-LD.

The effective precedence is:

1. exact localized manual override, when the domain entity supports it;
2. localized entity data;
3. reviewed deterministic locale template;
4. safe site-level image fallback where applicable.

Canonical URLs, hreflang and `x-default` are generated from the current route. They are not stored on Product or Category documents. Query parameters such as UTM, Variant selection and UI state never become part of the canonical Product URL.

## Publication and discovery

A Product is indexable and sitemap-eligible only when it is published, has a valid slug and belongs to a visible Category/Subcategory lineage. A Category is eligible only when its whole lineage is active. Sitemap entries are generated from those same rules.

`updatedAt` is emitted as `lastModified` only when it is a valid real timestamp. Do not use the current time as a synthetic signal.

Product JSON-LD may contain an `Offer` only when the canonical commerce helpers expose a real numeric sale price. Request-price and informational Products must not receive `price: 0`, fake reviews or ratings.

## Utility routes

Admin, account, request, search and other workflow routes are not SEO landing pages. Keep their central `noindex`/robots policy. A new route is not indexable merely because it renders successfully: public entity/content routes opt into the shared SEO factory; utility routes remain excluded.

## Admin overrides

The Admin preview shows effective metadata (manual override or automatic result). Manual title and description fields are optional. “Использовать автоматическое значение” removes the localized override; it never copies generated text into Firestore.

Duplicating a Product clears entity-specific manual SEO overrides. The new draft immediately derives its metadata from its own title, slug, price mode, image and taxonomy.

## Never

- persist generated title, description, canonical, hreflang, alt or JSON-LD;
- add a route-local canonical implementation when the shared factory applies;
- maintain manual sitemap URL arrays for domain entities;
- generate metadata with runtime AI;
- invent Product facts, prices, ratings, reviews or Merchant data;
- index filter, tracking or Variant-query combinations as separate entities.

Run the SEO unit/E2E suites and `npm run seo:verify:production` after a relevant release.

# SANPACK Automatic SEO Foundation handoff — 2026-09-22

## Status

**Release candidate passed the complete local gate and is ready for the controlled App Hosting rollout.** The final production source, revision and smoke results are reported in the release task that contains this handoff.

This is a code-foundation release. It does not write generated SEO into Firestore and does not mutate Products, Categories, prices, customers, requests, analytics or external search integrations.

## Production baseline

- Baseline Git source: `c06a9f0dbffb55903737766951be72ea198aded6`
- Baseline App Hosting revision: `sanpack-build-2026-09-22-004`
- Baseline health: healthy
- Baseline sitemap: 1,120 canonical URLs
- Release source: the `main` checkpoint titled `feat(seo): centralize automatic SEO foundation` that contains this handoff
- Release revision: the healthy App Hosting revision produced from that checkpoint; exact identifier is recorded in the final task result

## SEO precedence

The shared policy lives in `lib/seo/policy.ts` and follows one deterministic contract:

1. exact localized manual SEO override;
2. localized entity data;
3. reviewed RU/UZ/EN/ZH factual template;
4. site-level image fallback where an entity image is unavailable.

Generated title, description, canonical, hreflang, social metadata, alt text and JSON-LD are computed during server rendering. They are not persisted as generated Product or Category fields, so they cannot become stale after an entity title, description, image, price mode, slug or taxonomy assignment changes.

## Product automatic metadata

A published Product without manual `seo` receives:

- localized title with the SANPACK company suffix;
- localized description from visible Product content or a factual price-mode-aware template;
- clean Product canonical independent of UTM, Variant and UI query state;
- ru/uz/en/zh/x-default alternates;
- Open Graph and Twitter metadata;
- robots/indexability derived from publication, slug and visible Product-category lineage.

Generated copy does not invent material, purpose, manufacturer, origin, certification, environmental or own-production claims. Request-price and informational Products use a request-safe description and never promise a fixed price.

## Category automatic metadata

Group, Category and Subcategory pages use the same policy. An active taxonomy entity receives localized metadata, the current nested canonical path, reciprocal hreflang, social metadata and BreadcrumbList without a manual SEO form being mandatory.

A Category is indexable only when its complete lineage is visible. A draft/hidden Category remains excluded. Legacy flat Subcategory URLs continue to use the existing permanent-redirect contract rather than a second routing system.

## Image alt policy

- explicit media alt remains authoritative when present;
- main Product image fallback is the localized Product name;
- Variant image fallback is Product name plus localized Variant label;
- meaningful gallery images receive a restrained localized view suffix;
- thumbnail duplicates inside labelled controls remain decorative with empty alt;
- missing Product imagery remains an operational readiness issue while social metadata safely falls back to the configured site image.

## Canonical and hreflang

Canonical and alternates are generated from the current public route with the normalized production origin. Product Variant selection, tracking parameters and UI state do not create new canonical entities. Every localized public entity self-canonicalizes and exposes reciprocal ru, uz, en, zh and x-default targets.

The public bag-designer route now also uses the shared content factory. This removes a real inconsistency where its canonical was correct but its Open Graph URL inherited the Home URL.

## Structured data

Product and Breadcrumb structured data remain derived from the loaded domain entity and taxonomy lineage:

- real SKU, name, visible/factual description, image and brand are reused;
- Offer is emitted only when the canonical commerce helper exposes a real positive sale price;
- request-price and informational Products have no fake `price: 0` Offer;
- availability continues to use the existing Product status without claiming reservation or WMS behavior;
- no fake review, aggregateRating or Merchant fields were introduced;
- Organization and WebSite schema remain unchanged.

## Sitemap automation

Sitemap eligibility now reuses the same central indexability rules as metadata:

- published Product + valid slug + visible Product Category/Subcategory lineage → included;
- unpublished Product or hidden/invalid lineage → excluded;
- active Category with visible lineage → included;
- valid entity `updatedAt` is used only when it is a real date; no synthetic current timestamp is emitted.

No manual URL list or Firestore backfill was introduced. Product and taxonomy mutations continue to use the existing cache/revalidation paths.

## Indexability

Indexability is an explicit output of the effective SEO policy. Public entity/content routes opt into a shared metadata factory. Existing Admin, Profile, History, Request, Search and other utility route noindex/robots boundaries remain unchanged.

## Admin overrides

The existing Product and Category SEO editor now presents the automatic result first:

- `SEO готово` or concrete effective-output issues;
- automatic title, description, canonical and OG image;
- optional localized manual title/description overrides;
- `Использовать автоматическое значение`, which clears the localized override instead of copying generated text into the document;
- an effective SERP preview showing override-or-generated output.

Empty manual SEO fields are no longer treated as incomplete when effective SEO is valid. Character counts remain guidance rather than save blockers. The Product Operations row readiness message reflects the effective result.

## New Product and duplication workflow

A new draft immediately receives an automatic preview from its prospective title and slug. Publication then makes it indexable and sitemap-eligible only when the existing publication/taxonomy conditions pass.

Product duplication clears entity-specific manual SEO overrides. The copied draft therefore derives new metadata from its own title, slug and domain data; it cannot inherit a stale source title or description. Existing Product/Variant identity, draft publication, cleared SKU and media-reference safety semantics remain unchanged.

## Read-only catalog verification

The new effective policy was evaluated against the production projections without writes:

- Products evaluated: 238/238
- effective titles: 238
- effective descriptions: 238
- valid canonical outputs: 238
- entity Product images: 238; site-image fallbacks: 0
- Products eligible for a truthful Offer: 139
- request/informational Products correctly without Offer: 99
- indexable Products: 238
- taxonomy nodes evaluated/indexable: 31/31
- existing Product manual SEO overrides preserved: 238
- existing Category manual SEO overrides preserved: 3

The existing manual Product overrides remain authoritative by design. They were not mass-cleared or rewritten. New entities and any entity whose override is intentionally reset use the automatic policy.

## Tests

Targeted coverage includes:

- Product with and without explicit SEO;
- fixed and request-price Product behavior;
- Product with Variants;
- missing description and image;
- every supported locale;
- Group, Category and Subcategory metadata;
- hidden lineage/indexability;
- Product and Category sitemap publication transitions;
- clean canonical for UTM and Variant query state;
- reciprocal hreflang;
- duplicate Product SEO reset;
- explicit, Product, Variant, gallery and decorative alt behavior;
- truthful Product/Breadcrumb JSON-LD;
- Admin automatic preview/reset and capability boundaries.

Final local gate:

- `npm ci`: passed
- `npm ls --depth=0`: passed
- unit suite: 77 files passed, 6 skipped; 598 tests passed, 20 skipped
- typecheck: passed
- lint: passed
- production build: passed
- default E2E: 164 passed, 4 intentional skips
- taxonomy E2E: 95 passed, 1 mobile-inapplicable skip
- targeted SEO E2E: 9 passed
- `git diff --check`: passed
- high-confidence secret scan: no findings
- production dependency audit: 0 vulnerabilities

## Production verification

The controlled release smoke must verify, without Product writes:

- `/api/health` reports the release revision healthy;
- the 1,120-URL sitemap remains canonical and valid;
- a fixed-price Product exposes Product + real Offer + BreadcrumbList;
- a request-price Product exposes no Offer;
- Product and Category title, description, canonical, hreflang, OG and image alt are present;
- nested Subcategory metadata and breadcrumbs remain correct;
- bag-designer Open Graph URL matches its own canonical;
- the enhanced production SEO verifier completes with zero failures.

## Developer contract for future pages

The project-local standard is documented in `docs/SEO_BY_DEFAULT.md`. Future indexable entity/content routes use the shared policy/factory. Utility routes remain noindex. Developers must not add route-local canonical implementations, manual sitemap arrays, duplicated JSON-LD generators, runtime AI metadata or invented commerce/review data.


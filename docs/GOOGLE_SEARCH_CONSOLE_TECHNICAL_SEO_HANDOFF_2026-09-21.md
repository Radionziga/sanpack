# SANPACK Google Search Console Technical SEO handoff — 2026-09-21

## Status

**SANPACK GOOGLE SEARCH TECHNICAL SEO CLEANUP LIVE.** Production-oriented remediation was completed against the actual Google Search Console property `https://sanpack.uz/` owned by the Hello Clarity Google session. The final code is live, the production crawl is clean, and Google recrawl of historical report rows remains asynchronous.

No Product, price, taxonomy, publication, customer, request, Telegram, analytics or Price Manager data was changed.

## Production source/revision

- Baseline Git source: `802745602fcfa5da090a71848cbeceeee343e592`
- Baseline App Hosting revision: `sanpack-build-2026-09-21-002`
- Baseline health: healthy
- Release Git source: `c06a9f0dbffb55903737766951be72ea198aded6`
- Release App Hosting revision: `sanpack-build-2026-09-22-004`
- Release health: healthy, 100% production traffic

## Search Console baseline

Page Indexing was last updated by Google on 18 September 2026: 438 indexed URLs, 807 not indexed URLs and eight current reasons.

| Reason | URL count | Classification | Action |
| --- | ---: | --- | --- |
| Page with redirect | 33 | Expected / historical | Root, locale-less and historical URLs should not be indexed. Current aliases are reduced to one permanent hop where SANPACK has a known replacement. |
| Soft 404 | 8 | Historical/stale | All eight examples now return real, content-rich 200 pages with H1 and self-canonical. Google live tests confirmed representative current pages are available to Google. No bulk validation was started for stale rows. |
| Duplicate without user-selected canonical | 5 | Historical + expected utility | Public content pages now self-canonical. Favorites/request are intentionally non-indexable utility pages. |
| Alternate page with proper canonical | 5 | Expected + two repaired aliases | Three print-document URLs remain intentionally non-indexable alternates. Two retired taxonomy slugs now permanently redirect to real replacements. |
| Blocked by robots.txt | 4 | Expected | Request/profile/favorites utility URLs remain blocked and carry `X-Robots-Tag: noindex, nofollow`. |
| Not found (404) | 1 | Expected | Malformed `https://sanpack.uz/&` correctly returns 404 and is absent from current internal links and sitemap. |
| Discovered, currently not indexed | 683 | Google recrawl pending | Mostly new localized static, taxonomy and Product URLs from the current 1,120-URL sitemap; examples have never been crawled. No code defect inferred. |
| Crawled, currently not indexed | 68 | Google indexing decision pending | Representative examples are current Product pages; one example is a font asset. Current canonical pages are valid and indexable. |

## Soft 404

The complete current Search Console example set was inspected:

- `/en/product/musornye-pakety-50-70-sm-41-l-25-sht-tb-003`
- `/en/product/vakuumnye-pakety-25-35-sm-vb-003`
- `/en/product/kurinyy-okorochok-ch-007`
- `/en/product/otryvnye-pakety-28-38-sm-ultraprochnye-303-sht-to-002`
- `/en/product/kvadratnye-salfetki-23-23-sm-100-sht-pg-004`
- `/en/product/mikky-zheltye-rezinovye-perchatki-l-2-sht-gl-002`
- `/en/product/apelsin-egipetskiy-krupnyy-fr-001`
- `/zh/contacts`

Google last crawled these pages on 1–6 September. Current production checks found HTTP 200, unique localized H1, meaningful server HTML and a self-canonical on every example. URL Inspection for the first Product showed the old crawl had no user-declared canonical; a live test on 21 September returned “URL is available to Google”, a valid Product item and a valid Breadcrumb item.

The report is therefore stale rather than evidence that current Product content is thin.

## Redirect URLs

Representative Search Console examples were `/`, `/bag-designer`, `/favorites`, locale-less Category/Product URLs and historical aliases. Their exclusion is expected.

The remediation makes the important taxonomy contract explicit:

- a current flat Subcategory alias returns one HTTP 308 to its nested canonical;
- an unknown Category URL returns a real HTTP 404 before React streaming begins;
- `/catalog/branding-polygraphy` and localized variants return one 308 to the existing `/branding` service page;
- `/catalog/svezhaya-zelen-novagreen` and localized variants return one 308 to `/catalog/ovoshchi-frukty-zelen/svezhaya-zelen`;
- redirect sources are not present in sitemap or current internal navigation.

The early route decision is bounded to Category URLs and uses the existing public Category projection plus the existing taxonomy resolver. It does not create another taxonomy store or change Category data.

## Canonical duplicates

The five “duplicate without user-selected canonical” examples were:

- `/uz/privacy`
- `/ru/favorites`
- `/ru/request`
- `/ru/terms`
- `/ru/clients`

The public content pages now self-canonical. Favorites and Request are utility flows, blocked from crawler discovery and served with `X-Robots-Tag: noindex, nofollow`; they are not SEO landing pages.

The five “alternate with proper canonical” examples were:

- `/uz/catalog/branding-polygraphy`
- `/ru/catalog/print`
- `/en/catalog/print?prices=1&lang=en`
- `/ru/catalog/print?prices=1&lang=ru`
- `/uz/catalog/svezhaya-zelen-novagreen`

Print-document variants remain expected alternates. The two obsolete taxonomy slugs now use explicit permanent redirects to current public content instead of streamed `200 + noindex + Home canonical` responses.

Catalog filters, pagination, UTM/click parameters and Product `?variant=` URLs keep a clean route-derived canonical. They never enter sitemap as separate entities.

## Robots

`robots.txt` returns 200 and continues to protect `/admin/`, `/api/` and localized Search, Favorites, Request, Orders, Profile and Catalog Print utility routes. No public Product, Category, Subcategory or content route is blocked.

Actual blocked examples (`/request`, `/uz/profile`, `/uz/favorites`, `/zh/request`) are expected. Private and utility routes were not unblocked to reduce the Search Console count.

## Sitemap

- Search Console status: Successful
- Submitted: 14 September 2026
- Last processed: 21 September 2026
- Discovered URLs: 1,120
- Baseline composition: 952 Product + 124 taxonomy + 44 static localized URLs
- Baseline full production crawl: 1,116 clean; four localized Home pages were the only URLs without an H1
- Remediation: one concise localized SANPACK/Horeca H1 was added to Home without keyword stuffing
- Post-rollout full crawl: 1,120 passed, 0 failed

The verifier rejects duplicate, cross-origin, query-parameter and trailing-slash sitemap entries, and checks every sitemap URL for HTTP 200, absence of redirect/noindex, exact self-canonical, localized H1, ru/uz/en/zh/x-default alternates and required Product/Breadcrumb JSON-LD.

## Canonical/hreflang

All sitemap HTML had locale self-canonical and reciprocal ru/uz/en/zh/x-default tags. A separate inconsistency existed in the automatic `next-intl` HTTP `Link` header: x-default pointed to a locale-less redirect while HTML correctly pointed to the RU 200 page. Automatic header alternates are now disabled; the application metadata remains the single authoritative hreflang source, with absolute 200 targets.

Representative query checks:

- Catalog filters/sort/page/UTM → clean Catalog canonical
- Category filters/UTM → clean nested Category canonical
- Product variant/UTM/gclid → clean Product canonical

`http://sanpack.uz` returns one 301 to the preferred HTTPS host. `www.sanpack.uz` currently has no DNS record, so there is no live alternate host producing duplicate content.

## Structured data

Search Console Product snippets on 20 September:

- critical/invalid: 0
- valid pages: 2
- optional warnings: missing `aggregateRating` and `review` on 2 items

Search Console Breadcrumbs:

- critical/invalid: 0
- valid pages: 13

The actual production request-price Product `golubika-500-g-br-001` has Product JSON-LD without an Offer. Fixed-price Products use the real minimum sale offer; comparison prices are not substituted. Availability uses the existing catalog status and does not claim reservation/WMS guarantees.

Product structured-data construction is now isolated in a tested pure helper. No fake rating, review, price, return policy or shipping promise was introduced.

## Product review/rating warnings

SANPACK has no public review system. Missing `aggregateRating` and `review` are optional recommendations, not critical defects. They remain intentionally absent until real visible customer reviews exist.

## Merchant/Shopping opportunity

Search Console found 135 Products that could be submitted to Shopping and currently reports no critical merchant-listing errors on the two crawled items. Optional warnings concern shipping details, return policy and global identifiers.

SANPACK remains a request-based B2B flow (`Cart → Request → manager confirmation`), not a completed online purchase flow. Merchant Center, feeds, checkout, shipping/return policy schema and fake purchase semantics were not created. This is a future business decision, not a Technical SEO blocker.

## Internal links

A bounded production discovery check covered Home, Header/Footer, Catalog, Category, Subcategory, Product/related/breadcrumb context, Link Hub and representative static content. The first post-rollout check found two Home promo links that still pointed to valid one-hop Category redirects. Banner rendering now resolves CMS-managed internal Category links to their current canonical taxonomy paths without changing persisted content or taxonomy. The final 150-URL discovery pass found zero redirect/4xx/5xx targets.

The malformed `https://sanpack.uz/&` 404 reported by Google named two Product pages as historical referrers, but neither current server HTML contains that link.

One isolated `500` was observed once on `/uz/catalog/pakety-i-meshki` during the first 180-URL discovery pass. Five immediate repeats plus all four locale variants returned 200, and the final 150-URL pass had no failures. It is classified as a transient runtime response, not a reproducible route defect; production health remained `ok`.

## Tests

Targeted coverage includes:

- real 404 for an unknown Category;
- one-hop permanent redirect for a flat Subcategory;
- explicit redirects for the two retired Search Console taxonomy slugs;
- clean canonical for Product variant + UTM parameters;
- absolute localized hreflang/x-default metadata;
- localized Home H1;
- truthful fixed/request/informational Product JSON-LD;
- no invented review/rating fields;
- existing robots boundaries;
- full 1,120-URL production SEO verifier.

Final release-gate results for source `c06a9f0dbffb55903737766951be72ea198aded6`:

- `npm ci`: passed
- `npm ls --depth=0`: passed
- unit suite: 76 files passed, 6 skipped; 582 tests passed, 20 skipped
- typecheck: passed
- lint: passed
- production build: passed
- default E2E: 160 passed, 4 intentional skips
- taxonomy E2E: 91 passed, 1 desktop-only skip
- targeted SEO E2E: 7 passed
- `git diff --check`: passed
- high-confidence secret scan: no findings
- production dependency audit: 0 vulnerabilities
- GitHub Actions run `35692214691`: quality and browser jobs passed

## Deploy

The first App Hosting attempt (`build-2026-09-21-003`) stopped safely during dependency installation, before an application image or rollout was produced. The Node 22 buildpack's npm detected two transitive entries omitted by the newer local npm lockfile writer: `brace-expansion@1.1.21` and `concat-map@0.0.1`. Production remained healthy on `sanpack-build-2026-09-21-002` throughout.

The lockfile was regenerated and verified with npm 10.9.4, matching the App Hosting buildpack's compatibility behavior. Exact npm 10 `ci`, the full unit suite, typecheck, lint, production build and dependency audit then passed locally. Follow-up route-status and internal-link regressions were fixed through normal `main` checkpoints; the final automatic rollout is `sanpack-build-2026-09-22-004` from `c06a9f0dbffb55903737766951be72ea198aded6`.

Post-rollout evidence:

- `/api/health`: `ok`, revision `sanpack-build-2026-09-22-004`;
- full sitemap verifier: 1,120/1,120 passed;
- composition: 952 Product, 124 taxonomy and 44 static URLs;
- fixed Product: truthful `Product + Offer + BreadcrumbList`;
- request-price Product: `Product + BreadcrumbList`, no fake Offer;
- current flat Subcategory and retired aliases: one HTTP 308 hop;
- unknown Category: real HTTP 404;
- final bounded internal-link discovery: 150 checked, 0 failures.

No Firebase data deployment, taxonomy/content mutation or business-data mutation was part of this release.

## Search Console validation state

No validation was started for expected Redirect, Alternate, Robots, 404, Discovered or Crawled exclusions. Soft 404 validation was also not started: the report is dated 18 September, all eight current examples are valid, and representative live inspection confirms current availability. Google should recrawl naturally from the successful sitemap rather than receive a misleading validation request for an already-stale cohort.

Final live inspection on 22 September used the canonical Category URL `/ru/catalog/myaso-ptitsa-yaytsa/govyadina` in the Hello Clarity property. Search Console reported both `URL is on Google` for indexed data and `URL is available to Google / page can be indexed` for the published-page test, with one valid Breadcrumb item and no error. No Request Indexing action was submitted.

## Google recrawl pending

Search Console reflects previous crawl state. Correct production behavior does not immediately remove historical rows. The 683 discovered URLs and many recently crawled Product URLs require normal asynchronous Google crawl/indexing; no repeated code changes should be made while waiting.

## Future SEO opportunities

- Reassess Merchant Center only if SANPACK adopts a factually eligible purchase/shipping/returns flow.
- Add rating/review schema only after a real, visible review product exists.
- Review coverage again after Google processes the current 1,120-URL sitemap; treat only unexplained canonical public-page failures as defects.

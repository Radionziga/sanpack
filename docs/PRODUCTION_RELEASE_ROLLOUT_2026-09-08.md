# SANPACK production release rollout — 2026-09-08

## Status

**PRODUCTION RELEASE LIVE**

Accepted source `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14` (`fix: close stabilization verification blockers`) is live as App Hosting `build-2026-09-08-001` / `rollout-2026-09-08-001` with 100% traffic. Custom and hosted domains are operational.

## Preflight and production changes

- Git ancestry and exact source were verified; `origin/main` advanced without force from `39c1ceaec4e9d2e9a7a27e6e080e1dd9be1373b9` through the reviewed commits to `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14`.
- The App Hosting branch policy remains `main`; backend `sanpack`, project `stamply-4df8a`, region `asia-southeast1`.
- Existing active owner `super_admin` grant was matched to an enabled Firebase Auth user. No grant was created or changed.
- Runtime IAM and five required secret bindings were verified by name/version/access only; values were not read. No IAM or secret change was made.
- Firestore ruleset `404a711f-2e4f-46a6-b0be-0cea21c8ca74` and Storage ruleset `c1c6f62a-1377-4c2a-8833-b9c02ee58a08` were not redeployed or changed.
- `rateLimits.expiresAt` TTL remains `ACTIVE`.
- Production lacked the customer-history composite index declared by the accepted code. Exactly one index was created: `requests(customerUid ASC, createdAt DESC, __name__ DESC)`, ID `CICAgOjXh4EK`. It reached `READY` and the real query shape executed successfully before the application rollout. No existing indexes were deleted.
- The only production mutations were the required composite-index creation and the exact-source App Hosting deployment. No catalog/settings/order/media data, taxonomy, rules, IAM or secrets were changed.

Rollback snapshots are stored outside the repository in the local protected directory `/tmp/sanpack-rollout-20260908-UBkq7v`. They include prior traffic/build identity, ruleset sources/IDs, IAM/bucket state, secrets metadata, TTL/index state and smoke evidence; no secret values are included.

## Deployment

- Build `build-2026-09-08-001`: `READY`.
- Rollout `rollout-2026-09-08-001`: `SUCCEEDED`.
- Traffic: 100% to the new build; no target split or reconciliation remained.
- Domains: `https://sanpack.uz` and `https://sanpack--stamply-4df8a.asia-southeast1.hosted.app`.
- Health reports revision `sanpack-build-2026-09-08-001`.

Rollback target is `build-2026-09-04-002`, source `39c1ceaec4e9d2e9a7a27e6e080e1dd9be1373b9`. Firestore/Storage rules were unchanged, so application rollback does not require weakening or reverting the current security boundary.

## Production smoke

- Hard GET returned real HTML/data with HTTP 200 for health, public catalog API, RU/UZ/EN/ZH home pages, catalog, Category, two Products (simple and variant), search, favorites, request, profile, robots and sitemap. No unavailable/error shell markers were present.
- Public API returned 238 Products and 27 Categories. No production Subcategory mapping exists yet, as intended.
- Raw Product HTML contained visible name/H1, description, image, sale-price context, canonical, five hreflang links and Product/Offer/Breadcrumb JSON-LD. A normal browser Product open made no client request for the full products collection.
- Sitemap contained 1,100 unique canonical URLs (275 per locale), no duplicates and no admin/API/search/favorites/request/profile/print utilities. Robots disallows private/utility paths and exposes the sitemap.
- Desktop journeys preserved Category sort/view/filter query and hash, scroll position, Search query, and locale-switch query/hash across Product navigation and Back.
- At 390×844, a real Product variant was selected, added to local cart and quantity changed locally. The cart dock stayed within the viewport and the contact FAB did not overlap Product, Category or Checkout fixed actions. No request was submitted.
- Authenticated owner session loaded dashboard, 238-row Product administration with search/filter/sort/pagination controls, 27-node Category tree, Attributes, Settings and Media Library. Media reported 252 files / 32.2 MB, 238 used and 14 unused. No Admin save/delete/upload mutation was performed.

## Security and monitoring

- Anonymous direct Firestore Product read: 403; trusted `/api/catalog`: 200.
- Public Storage media GET: 200; direct list and anonymous upload: 403. The upload probe created no object.
- Private asset route without authorization: 403; anonymous Admin redirects to login; protected request/PDF reads return 401.
- Post-release Cloud Logging snapshot since traffic switch: zero severity `ERROR` entries; zero `order.creation_failed`, `order.notification_failed` and `bag_designer.operation_failed` events. Observed 404s were external WordPress/CMS probes; observed 401/403 entries matched deliberate boundary probes. Final health/catalog/home/Product soak checks remained 200.

No live customer order, PDF generation, Telegram notification or paid AI request was made: production has no isolated suppress/test workflow. Those mutation/concurrency/idempotency paths rely on the accepted emulator/integration/browser regressions and are not claimed as live-notification verification.

## Remaining non-blocking item

- **F12 — denied route → allowed navigation recovery.** For a `content_manager`, a denied screen in the persistent Admin layout may remain until Reload after navigating to an allowed section. This is not an authorization bypass. Future patch direction: make the route boundary update with navigation; do not loosen capability checks.

Production taxonomy mapping, content migration, legacy vetclinics cleanup, real-order testing and analytics remain separate explicitly authorized operations.

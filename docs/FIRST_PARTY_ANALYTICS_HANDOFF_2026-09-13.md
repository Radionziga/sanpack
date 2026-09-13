# SANPACK First-Party Analytics Handoff — 2026-09-13

## Status

Release candidate implemented. Final production identity/revision and collection start time are recorded after the controlled rollout; no historical analytics is fabricated.

## Analytics architecture

Storefront instrumentation sends best-effort typed events to `POST /api/analytics/events`. The trusted Node handler validates origin, size and schema, applies distributed rate limits, derives server time/device category, and transactionally writes Firestore. Browser code never receives Firestore credentials and never writes Firestore directly.

Collections:

- `analyticsVisitors`: opaque first-party visitor lifecycle only.
- `analyticsSessions`: 30-minute inactivity sessions with landing attribution and coarse context.
- `analyticsEvents`: bounded event facts used for server aggregation.

`GET /api/admin/analytics` checks `analytics.read`, queries only the selected/previous period, aggregates on the server and returns a dashboard DTO without visitor/session IDs. The current 238-product scale does not justify BigQuery, an event bus or a second analytics platform.

## Privacy contract

Analytics stores no name, phone, email, Telegram ID, customer UID, address, comment, auth token/cookie value, full IP, full User-Agent or device fingerprint. Persistent visitor/session IDs are random opaque UUIDs and are not linked to customer documents. Search is bounded and redacts email/phone-shaped text. Paths exclude query strings; referrer is hostname-only; only UTM source/medium/campaign/content/term are accepted. Link Hub events contain item ID/type, not destination URL.

Admin traffic with an Admin session, obvious bots, DNT/GPC, local development and explicit opt-out are excluded. Privacy copy explains pseudonymous usage analytics and exposes a first-party opt-out action. Analytics availability never blocks catalog, cart or request UX.

## Visitor/session semantics

- New visitor: first stored event for a new opaque visitor UUID.
- Returning visitor: visitor existed before the selected period.
- Session: new when no valid session cookie exists or last server-recorded activity is older than 30 minutes.
- Visitors: exact distinct visitor IDs in the selected bounded period, never a sum of daily uniques.
- Timezone: `Asia/Tashkent`; Today is hourly, longer ranges daily; maximum report range is 90 days.
- Surface: `web` or `telegram_mini_app`; device: mobile/tablet/desktop.

## Event taxonomy

Engagement: `page_view`, `catalog_view`, `product_view`, `search`, `add_to_cart`, `remove_from_cart`, `cart_view`, `request_start`, `repeat_composition`, `link_hub_click`, `contact_click`.

Confirmed conversion: `request_created`. The public schema rejects this event. It is emitted only after the canonical Request handler returns a successful creation/replay result and is deduplicated by `request-created:{requestId}`. An analytics write failure is logged but does not roll back an accepted Request. Admin isolated `order-tests` never enters this conversion path.

## Attribution

The first event of a session captures allowlisted UTM values, normalized landing pathname and referrer hostname. UTM source has priority; otherwise the server classifies Telegram, social, search, referral or direct without inventing attribution. The session attribution is reused for later Product/cart/request events. Arbitrary query fields and advertising click IDs are not stored.

## Admin dashboard

`/admin/analytics` uses the existing Admin shell and is initially available only to `super_admin`. It provides Today, Yesterday, 7/30/90 days and custom dates; locale/surface/source/campaign/category filters; current/previous KPI comparison; switchable trend chart; operational funnel; traffic sources; sortable products; campaign performance; top pages; no-result searches; and locale/device/surface breakdowns. Loading, retryable error, empty/pre-launch and truncated-query states are distinct.

Funnel is an operational approximation over distinct visitors per event step: Visitors → Product viewers → Cart adds → Request starts → Requests created. It does not claim strict ordered-path causality.

Product table shows current Product name/SKU/category plus views, unique visitors, cart additions, requests, view-to-cart and view-to-request conversion. No raw visitor list is available.

## Storage, retention and cost

- Events and sessions receive `expiresAt` at +190 days.
- Visitors receive `expiresAt` at +400 days so new/returning semantics remain defined.
- Dashboard reads at most 90 days plus its previous comparison period and caps a report query at 50,001 documents; truncation is explicit.
- Production TTL policies must be verified `ACTIVE` through scoped Firestore field configuration. No manual mass deletion or rules deployment is needed.

At current scale server aggregation is deliberately simpler than maintaining rollup documents. If the explicit query cap is reached, add trusted daily rollups as a measured scaling task; do not move raw aggregation into React.

## Rate limits and failure semantics

Public ingestion uses same-site origin validation, strict discriminated schemas, 8 KiB payloads, bounded strings, deterministic event dedupe, 500 events/session, per-trusted-IP limit when a verified IP source exists, and whole-store distributed ceilings. Client timestamps are ignored. Ingestion errors are silent to customers; Admin backend errors show Retry instead of zero statistics.

## Related UX corrections

- Category Admin now exposes the two real presentation slots: sidebar navigation icon and Home bento cover. Existing code artwork remains an explicit previewed fallback; no catalog migration was made.
- Request validation now explains failed submission and scrolls/focuses the first invalid field, including delivery date/window.

## Tests

Targeted coverage includes public schema/PII rejection, path/search sanitization, attribution, visitor continuation/expiry, event dedupe, exact uniques, ranges/comparisons, funnel/products/campaign/search aggregation, public conversion rejection, one server conversion across concurrent/idempotent Request handler calls, no conversion on test orders, Admin capability/API denial, direct Firestore denial, cross-origin rejection, storefront/UTM/Product/cart/request instrumentation, Mini App surface, responsive Admin dashboard, category image fallback UX, and checkout validation focus/scroll.

Final command counts/results belong to the release report after the final clean-tree gate; earlier counts are not reused.

## Deployment prerequisites and rollback

1. Confirm exact Git source, clean release snapshot, production health, main branch trigger and rollback revision.
2. Verify/add only the three scoped TTL policies and wait for `ACTIVE`.
3. Push the exact accepted checkpoint normally; do not force-push or run a duplicate deploy.
4. Smoke safe engagement events and owner dashboard without creating a real Request.
5. Monitor ingestion/report/Firestore errors and storefront health.

Rollback is App Hosting traffic back to the previous healthy revision. Additive analytics collections and TTL policies are safe for the old application to ignore; Firestore/Storage rules, IAM, secrets, catalog, customer and order data are unchanged.

## Known limitations

- No data exists before production collection starts.
- Attribution is session-first-touch and intentionally modest, not multi-touch advertising attribution.
- Obvious bot/internal filtering is best-effort without fingerprinting.
- Raw-query aggregation is bounded for current scale; daily rollups are deferred until measured volume requires them.

## Future analytics work

Only after real volume: evaluate daily trusted rollups if the explicit report cap is approached, and separately map the stable event names to GA4/Metrica if the business chooses external analytics. No user replay, heatmaps or customer behavioral profiles are planned.

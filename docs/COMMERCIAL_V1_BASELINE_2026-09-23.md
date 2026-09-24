# SANPACK Commercial V1 — production baseline

## Status

The owner-controlled production cycle on 23 September 2026 proved the customer → Request → manager Telegram → Admin → customer-history path. The final code checkpoint is the commit containing this document; its exact hash and App Hosting revision are recorded in the release handoff after rollout. This is a V1 operational freeze, not a ban on focused fixes.

## Production source and rollback

- Pre-verification source: `d29c32f2993941775a63668a20f8ad2d5c5d16da`.
- Pre-verification App Hosting revision and rollback target: `sanpack-build-2026-09-23-001`; `/api/health` returned `ok` on 23 September 2026.
- The release changes only customer/Admin presentation of existing Request states and the Mini App's expired-session error message. No production Product, taxonomy, price, customer, request-content, analytics, SEO, or Telegram configuration migration was performed.

## Domain and customer identity

The established catalog, variant, pricing, quantity, Request, and customer-session contracts remain authoritative. The real cycle used an owner-controlled Telegram Mini App account. One stale Telegram proof produced HTTP 401 and **no Request**; reopening the Mini App refreshed the proof. No credentials or forged proof were used. The UI now explains this case rather than suggesting an Internet failure.

## Catalog and pricing

The existing published fixed-price Product `SP-VB-001` (vacuum bags, 15×25 cm) was selected without editing catalog data. One unit at 900 UZS satisfied the displayed minimum and step of one. Customer UI, manager notification and Admin all displayed 900 UZS. The server-side Request contract recalculates prices and validates quantity against current Product data; browser cart totals are not trusted. Request-price regression tests remain in the established suite.

## Request flow and Telegram

- Exactly one successful customer Submit produced `ORD-E4FEEA03` at 21:23 local time on 23 September 2026. Admin total increased from 8 to 9, not 10.
- The Request kept its original item, quantity, price, delivery selection and owner-provided contact fields through status changes. The customer receipt displayed the same number and amount.
- Admin reported `Доставлено в Telegram`; the owner personally confirmed the matching message arrived in the SANPACK manager chat. No manual second notification was sent.
- The successful UI clears its idempotency intent; a live replay was deliberately **not** sent with a new key, which would risk a second business Request. Existing automated idempotency tests cover same-key replay. The single production Request and +1 Admin count are observed facts, not a substitute for a live replay assertion.

## Admin, audit and history

Admin showed the Request with notification state and revision 1. The owner-approved `new → processing` transition raised revision to 2; that modal path exposed an inaccurate generic edit audit entry. The final patch routes status-only modal edits through the existing status mutation. The owner-approved `processing → cancelled` transition raised revision to 3 and recorded a correct status-change audit entry. The Request and audit were retained as evidence, not deleted.

The owner-controlled Mini App history displayed the Request and existing Requests of that account only. The original static acceptance message did not reflect later statuses; the patch shows a localized current-status message, including `Заявка отменена.`. `Повторить состав` reconciled the current Product, added one item only to local cart, sent no second Request, and the owner-authorized cart cleanup left the cart empty.

## Analytics

The first-party Admin dashboard displayed one `request_created` conversion and one Request in the selected period; the Product breakdown included `SP-VB-001`. The server uses a Request-ID-based dedupe key and anonymous Product/attribution fields, without customer contact or address. The external bridge maps the confirmed Request to GA4 `generate_lead` and Yandex goal `request_created`, never `purchase`; allowlisted payloads exclude name, phone, address, Telegram ID, customer UID and comment. Provider-side realtime receipt was not independently proven by this single cycle, and no duplicate Request was created to force one.

## SEO, Price Manager and Product Operations

The existing automatic SEO foundation, category-sheet Excel Price Manager and Product Operations remain unchanged. See their dedicated handoffs in this directory. This verification did not initiate another catalog, SEO or security audit.

## Real E2E evidence and release gate

Evidence: owner-confirmed manager notification; Admin Request number, 900 UZS total, notification state, final `cancelled` status and revision 3; owner-controlled customer history; first-party analytics conversion count; production `/api/health`. The read-only production check found no Request-created duplication after the initial 401. The release gate passed: `npm ci`, dependency-tree check, 603 unit tests (20 skipped), typecheck, lint (0 errors; 2 pre-existing warnings), a 100-page production build, 166 browser E2E tests (4 skipped), 32 Firestore boundary checks, 7 Storage checks, and 20 order/customer/Telegram/analytics emulator integrations. Diff check and high-confidence release-diff secret scan found no issue. The build and E2E ran from an isolated temporary source copy because iCloud file-provider stalls affected the Desktop checkout. Production post-rollout smoke must confirm the corrected customer status copy.

## Operational mode and known non-blocking backlog

After the final rollout, treat this source/revision as Commercial V1. Handle bugs as small patches with targeted tests; product features as separate business goals; SEO/performance changes only from measured evidence; and architecture changes only with concrete need. Existing content-review items (ambiguous grocery SKUs, beef-cut naming, ZH gaps and duplicate-image review), eventual legacy customer-cookie bridge retirement, and Search Console recrawl/data accumulation remain non-blocking. None justifies a new general audit.

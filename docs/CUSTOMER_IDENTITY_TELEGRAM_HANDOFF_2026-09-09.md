# Customer identity, Telegram and isolated order verification — 2026-09-09

Status: **READY FOR INDEPENDENT REVIEW** as a local release candidate. Baseline is `077623902f5a5da6ead798d16cdb4d14b9c5d34e`; the final checkpoint hash is recorded in the task handoff because this document is part of that checkpoint. Nothing from this stage has been pushed or deployed.

## Scope and existing architecture

SANPACK keeps one customer identity system. Telegram proves identity through either:

1. browser OIDC authorization code flow with state, PKCE and nonce; or
2. Telegram Mini App `initData`, validated server-side with the configured storefront bot secret and a bounded `auth_date`.

Both paths resolve through `lib/customer/telegramIdentity.ts`, create or find one `customers` profile, then issue the existing signed HttpOnly customer cookie. The stable cross-flow key is the verified Telegram user `id`; OIDC `sub` is retained as provider/legacy metadata and is not assumed to equal Mini App `user.id`. Existing customer document IDs are not rewritten. Up to eight matching legacy UIDs can be carried in the signed session as read-only history aliases.

The first verified login is registration: it creates the profile automatically. The customer may then edit contact/company fields. A later Telegram login refreshes provider metadata but transactionally preserves edited `name` and `phone`. Phone number is profile/contact data only; it never proves ownership and an OIDC phone claim is accepted only when Telegram marks it verified.

New cookies include a random per-session identifier backed by `customerSessions/{sha256(sessionId)}`. Each request verifies the signed token and the server record. Logout revokes exactly that record and clears the browser cookie. The JWT/session duration remains 30 days. Cookies issued before this release have no session record and remain accepted until their existing signed expiry as a deliberate rollout bridge.

## Trust boundaries

- Browser OIDC: signed flow cookie + exact state + PKCE verifier + ID-token issuer/audience/signature/expiry + nonce. Redirects are limited to RU/UZ/EN/ZH relative paths, preserving safe query/hash values.
- Mini App: client-supplied `initData` is never identity until server HMAC and freshness validation succeeds. Invalid data is rejected, not downgraded to a guest request.
- Customer profile/history: only the signed, active session determines customer UID/aliases. Phone, cart and favorites are not identity.
- Orders: the public request schema rejects notification/test controls and all client prices/totals. The trusted server reads current Products, applies quantity/variant/price rules and persists a canonical snapshot.
- Notifications: recipient/token/config are selected only on the server. Customer receipts and history omit customer UID, audit actors, notification internals and operational metadata.
- Operational smoke: only an authenticated admin with `orders.write` can use `/api/admin/order-tests`; public users cannot activate suppression.

## Confirmed findings and fixes

| ID | Severity | Confirmed problem | Resolution |
| --- | --- | --- | --- |
| CI-01 | P1 | OIDC used `telegram:<sub>` while Mini App used `telegram:<id>`, allowing duplicate profiles/history. | Added shared resolver keyed by verified Telegram `id`, legacy-primary preservation and bounded signed aliases. |
| CI-02 | P1 | Repeat login overwrote customer-edited name/phone; a concurrent edit could also be restored from a stale login read. | Provider and editable fields are separated; final preservation/write is a Firestore transaction. |
| CI-03 | P1 | Logout only cleared a stateless 30-day cookie. | Added independently revocable server session records and exact-session logout. |
| CI-04 | P1 | OIDC had PKCE/state but no nonce and accepted phone without its verification flag. | Added nonce round trip/check and verified-phone condition. |
| CI-05 | P1 | Intended destination lost query/hash and protected-route recovery was ambiguous. | Added localized relative return-path sanitizer and explicit login/expired/error/retry states. |
| CI-06 | P1 | Mini App cached the first Promise, including failure; account/initData changes could retain stale state. | Cache only in-flight/short successful identity, retry failures, abort old account bootstrap and prevent stale completion winning. |
| CI-07 | P1 | Signed browser customer A could be combined with Mini App identity B; invalid initData silently became guest. | Exact Telegram identity consistency is required (409 mismatch); invalid proof is 401. |
| CI-08 | P1 | Browser Telegram orders were labelled as Mini App orders. | Source is `web` unless a Mini App proof was actually verified. |
| CI-09 | P1 | No safe way existed to exercise canonical order persistence/notification handling in production. | Added isolated `testRequests`/`testRequestIdempotency` workflow with test sink, capability, rate limit and exact cleanup. |
| CI-10 | P1 | Notification outcome was not an explicit operational state. | New requests store `pending`, then `delivered`, `skipped`, `failed` or `suppressed`; failure keeps the accepted request. |
| CI-11 | P1 | Real Firestore rejected successful notification update because `reason: undefined` was serialized; the order/message existed but the first response became 503. | Omit absent Firestore fields. A real handler + Firestore Emulator regression now covers the successful write. |
| CI-12 | P1 | Profile mutation body was not explicitly bounded. | Uses the common bounded JSON reader (16 KiB) and strict Zod field limits. |
| CI-13 | P1 | A network/API failure during logout was shown as a successful local logout even though the cookie could remain active. | Profile and History now clear UI state only after an acknowledged logout and otherwise show a localized retryable error. |
| DEP-01 | P0 | Audit found a critical reachable Next advisory and high Sharp advisory in the accepted baseline. | Patch-level upgrades to Next 16.3.4 and Sharp 0.35.4; Firebase Admin updated to 14.3.0. Production audit now has no high/critical findings. |

No confirmed customer IDOR, Telegram signature bypass, public notification suppression or duplicate-order notification side effect remains in the tested contracts.

## User journeys

### Browser

Guest selects login from Profile/History/Request, is redirected to Telegram, returns through the verified callback, receives one SANPACK customer session and returns to the complete localized destination. Reload restores the active profile. Logout revokes that session; protected history shows the localized login recovery rather than stale orders.

### Returning customer

The resolver finds the existing Telegram ID and retains its primary UID. An edited profile remains authoritative, while fresh Telegram display/username metadata can update. Signed legacy aliases keep existing request history visible without destructive customer merging.

### Expired/revoked session

Expired JWTs, missing session records and records rebound to another customer are rejected. Profile/history return unauthenticated state; after login the full intended path is restored. Browser Back cannot restore authenticated API data because customer endpoints are `no-store`.

### Mini App

Profile and checkout await Mini App session bootstrap before loading customer state. Valid fresh `initData` resolves through the same Telegram ID as OIDC. Invalid, old, future-skewed or mismatched proofs fail. A changed account aborts the older bootstrap and cannot populate the client success cache.

### Ownership/history

`GET /api/requests` requires the active signed session and queries only its primary UID plus signed aliases. It deduplicates alias results, orders by creation time and returns at most 100 safe customer projections. A second customer and a matching phone receive no access.

## Order and notification reliability

`lib/orders/requestSubmission.ts` is the shared live/test orchestration boundary:

1. hash the exact business intent and look for a prior idempotency result before mutable catalog validation;
2. validate current Product/Variant/quantity and compute canonical snapshots/totals for a new intent;
3. atomically create the request and idempotency pointer;
4. only the creator attempts one notification;
5. atomically competing callers return the same receipt and do not notify again;
6. persist explicit notification outcome without exposing it in the public receipt.

A lost response can be replayed after a Product changes or is hidden. Same key + changed intent/customer returns a controlled conflict. Telegram failure leaves the request accepted and marks delivery failed; it does not create or notify a second order. Automatic delivery retry was not introduced because the current system has no queue/lease contract; a future manual retry must be idempotent and separately authorized before it is exposed.

## Safe test/suppress workflow

The Requests admin screen exposes **Безопасный smoke test** only to roles that already have `orders.write`.

- POST requires the literal `CREATE_ISOLATED_TEST_REQUEST`, a valid idempotency key and up to ten Product/Variant lines.
- The server supplies a synthetic test customer, phone, address/date/notes and test operator identity.
- It invokes the same canonical pricing, quantity, persistence and idempotency service.
- Data is stored only in `testRequests` and `testRequestIdempotency`; it is not visible in normal Admin orders, customer history or ordinary metrics.
- Notification is always the network-free `test_sink`; no bot token, chat ID, Telegram request, AI call or real customer is used.
- The distributed limit is 12 tests/hour/operator.
- Cleanup is one exact document at a time and requires `DELETE_ISOLATED_TEST_REQUEST`, exact document ID and matching `TEST-*` number. There is no bulk cleanup endpoint.
- Public `/api/requests` is strict and rejects `testMode`, `suppressNotification` and `notificationDestination`.

## Data model and compatibility

- `CustomerSession` adds optional `sessionId` and `identityUids` claims.
- `customerSessions` is additive, server-only and suitable for TTL on `expiresAt`.
- `RequestOrder.notification` adds optional status/channel/timestamps so historical orders remain readable.
- `RequestOrder.test` is optional and used only by isolated records.
- `testRequests` and `testRequestIdempotency` are additive server-only collections.
- `requests`, historical snapshots, Product/commerce semantics, Admin RBAC and Firestore/Storage rules are unchanged.

No destructive migration or mandatory backfill exists. Duplicate legacy customers, if any, are deliberately not merged automatically.

## Tests and release gate

Final snapshot evidence:

- clean `npm ci`; `npm ls --depth=0` resolves Next 16.3.4, Sharp 0.35.4 and Firebase Admin 14.3.0;
- Vitest: 59 normal files / 445 tests passed; two emulator-only files are exercised separately;
- identity/order Firestore Emulator integration: 2 files / 5 tests passed using real session/resolver/request handler and real Firestore transactions;
- security rules emulators: 26 Firestore boundary checks and 7 Storage checks passed;
- typecheck, ESLint, Next production build (91 static generation entries) and `git diff --check` passed;
- default Playwright desktop/mobile: 80 passed, including five customer identity/isolated smoke journeys;
- explicit stabilization: 42 passed;
- taxonomy/browser/security/a11y: 83 passed, one expected desktop-navigation skip on mobile;
- tracked-source secret signature scan passed;
- `npm audit --omit=dev`: 6 moderate findings in the Firebase Admin/Google Storage dependency chain rooted in the transitive `uuid` advisory, 0 high/critical. The suggested forced remediation would downgrade Firebase Admin and was not used;
- full audit: 17 moderate / 2 high / 0 critical. The two high advisories are dev-tool transitive `brace-expansion`/`js-yaml`, not production dependencies.

All browser tests use the local production-like seed fixture. No real Telegram OAuth, Telegram message, customer order or production data mutation was used as test evidence.

## Deployment prerequisites and controlled smoke

1. Reauthenticate operator Firebase CLI/ADC; do not print secrets.
2. Run `npm run identity:audit -- --project stamply-4df8a`. It is read-only and outputs aggregate counts only. Review canonical/legacy duplicates; do not merge them during rollout.
3. Reconfirm live source/build and application-only rollback target (`0776239` / build 002 at the time of this candidate).
4. Confirm the existing Telegram encryption secret binding and owner `orders.write` capability. No new secret, IAM, Firestore/Storage rules or catalog migration is required.
5. Apply/verify the scoped TTL field override for `customerSessions.expiresAt`. TTL is cleanup only, not session correctness.
6. Deploy the exact reviewed checkpoint. Smoke OIDC and Mini App with one controlled Telegram account; verify the same profile/history, preserved edited contact, logout and invalid/mismatched proof denial.
7. Run one isolated Admin smoke, verify canonical total, `TEST-*`, `notification.status=suppressed`, absence from normal `requests`, and absence of a Telegram message. Remove exactly that record through the guarded cleanup action.
8. Monitor `order.creation_failed`, `order.notification_failed`, customer session/profile errors and unexpected 401/409/429/5xx. Do not submit a real order solely for verification.

Rollback is application-only to the currently working build. Additive session/test collections are ignored by the old revision; no rules rollback or destructive data cleanup is required.

## Remaining limitations

- Existing pre-release cookies are intentionally stateless until their signed 30-day expiry; revocation is exact for newly issued sessions.
- Legacy customer duplicates are only aliased for history. Physical merge/backfill requires a separately reviewed deterministic data operation after the aggregate inventory.
- Guest orders identified only by contact phone are not retroactively claimed after Telegram login; phone is intentionally not accepted as proof of ownership.
- Customer history currently has a bounded latest-100 response, not cursor pagination.
- Failed Telegram notification is visible/logged but has no operator retry control yet; adding one requires an idempotent delivery contract, not a blind resend button.
- Production identity inventory and live isolated smoke are pending controlled deployment because operator credentials required reauthentication during this local stage.

## Production safety

Production writes: **NO**. Real requests/orders: **NO**. Telegram notifications: **NO**. Paid AI: **NO**. Customer merge/backfill: **NO**. Firestore/Storage rules, IAM and secrets: **UNCHANGED**. Push/deploy: **NO**.

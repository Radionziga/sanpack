# SANPACK final stabilization — 2026-09-08

Status: **PRODUCTION STABILIZATION LIVE**. Final application checkpoint `077623902f5a5da6ead798d16cdb4d14b9c5d34e` is deployed.
Baseline: local docs-only `31e52e8777f3e60e5e9b57a29c0f7608c755f63b`, accepted/live application source `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14`, build `build-2026-09-08-001` at 100%. Deployment branch is `main`. Rollback target for this patch is build 001, with unchanged security rules.

## Change and verification scope

F12: move pathname-dependent UI permission rendering from the persistent server layout into the existing client AdminShell. Preserve server authentication, shared capabilities and all API authorization. Regression: content_manager denied `/admin/settings` → menu `/admin/products` → Back → Forward; no denied editor controls or resource reads. Owner Products → Categories → Back remains available. Other F01–F17 code is unchanged and is checked through existing release regressions and non-mutating production smoke.

No catalog/order/settings/media mutations, rule changes, IAM/secret changes, migration or new authentication framework are included. Production order/PDF/Telegram/AI side effects must not be triggered by smoke.

## Next separate goal: Customer Identity / Telegram / Safe Order Testing

- Browser Telegram login: `/api/auth/telegram/start` and `/callback`, `lib/telegram/login.ts`; authorization-code flow with PKCE/state and verified ID token. Successful login upserts `customers/{telegram:sub}`. There is no separate customer password-registration flow; Admin Firebase Auth is distinct.
- Mini App: `/api/auth/telegram/mini-app`, `lib/telegram/miniApp.ts` and `miniAppSession.ts`; signed initData establishes the customer cookie. Checkout also verifies supplied initData.
- Customer session: `lib/auth/customerSession.ts`, signed HS256 `__sanpack_customer`, HttpOnly/Secure/SameSite=Lax, 30 days; key derived from existing encryption secret. `/api/auth/customer` provides profile GET/PUT and cookie logout DELETE. Guest profile/checkout drafts are local browser state.
- Orders: `/api/requests` binds canonical orders/idempotency to customer identity; authenticated history filters signed `customerUid`, uses the READY composite index and customer DTO. Guest phone identity does not grant history access.
- Notifications: `lib/telegram/notifications.ts` sends through configured encrypted bot credentials after new order creation. There is no existing isolated production suppress/test contract; never test by sending an ordinary real order.

Recommended order: map browser/Mini App identity equivalence and session lifecycle; verify reload/expiry/logout/re-login/profile merge and unknown checkout outcome; test history ownership; then design a server-authorized, isolated notification-suppression/test-order workflow before any real production order exercise. Specifically verify the lifetime of cached `pendingSession` in Mini App initialization and whether repeated login overwrites user-edited profile fields. These are next-stage verification questions, not newly established release blockers. Do not add auth providers or implement this next stage in the stabilization patch.

## Local release gate

Fresh npm ci and npm ls passed. Unit/API: 54 files / 415 tests passed. Typecheck, lint and production Turbopack build with SANPACK_USE_SEED_DATA=false passed. Default E2E: 70 passed; stabilization: 42 passed; taxonomy: 83 passed / one expected desktop-only skip on mobile. Security emulator: 26 Firestore and 7 Storage checks passed. Targeted F12/owner navigation: four desktop/mobile cases passed. git diff --check and secret-signature scan passed. Initial build and standalone stabilization startup encountered local ENOSPC; only disposable build caches were removed and those interrupted checks rerun successfully. No product code change was made to address the environment failure.

Preflight: operator authenticated; main branch trigger policy, exact origin ancestry, live build 001/100%, compatible rollback, runtime permissions and five enabled secret-version accessor bindings verified by metadata. Existing Firestore/Storage rulesets and READY customer-history index match the baseline. Owner Admin Product list works. Pre-release 21 read-only HTTP checks and two raw Product SSR checks passed; recent ERROR/5xx logs were empty. Evidence is retained locally at /tmp/sanpack-stabilization-20260908.


## Completed controlled rollout

- One logical checkpoint: `077623902f5a5da6ead798d16cdb4d14b9c5d34e` (`fix: refresh admin route access during navigation`), parent docs-only `31e52e8777f3e60e5e9b57a29c0f7608c755f63b`. Normal push to verified `origin/main`; no force push.
- GitHub main push automatically created App Hosting `build-2026-09-08-002` / `rollout-2026-09-08-002`; no second/manual deployment was dispatched. Source hash read back exactly matches checkpoint. Build READY, rollout SUCCEEDED, 100% traffic, reconciling false.
- Cloud Run / health revision: `sanpack-build-2026-09-08-002`. Cloud Build `afc3d92d-eca8-4508-8df1-ae9c5f5df0c4` succeeded. Live health confirmed from 2026-09-08 18:04 UTC.
- Compatible rollback: App Hosting `build-2026-09-08-001`, source `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14`. Create a new rollout targeting this existing build if a critical regression is confirmed; do not change rules or data. Rollback was not required.
- Post-deploy HTTP: 21 checks passed, including health, catalog API (238 Products / 27 Categories), homepage RU/UZ/EN/ZH, catalog/Category, two Product hard entries, search/favorites/request/profile, robots/sitemap and four anonymous security denials. No HTTP-200 error shell. Two raw Product HTML responses contain H1, main content, visible sale prices 25 000 / 15 500, canonical and Product JSON-LD. Sitemap parses with 1100 unique URLs and no search/favorites/request/profile utility URLs.
- Post-deploy browser: owner Products → Categories → Back passed; catalog query/hash → Product → Back/Forward preserved URL state, restored catalog position and opened Product at scrollY 0. RU → EN retained `?sort=name&view=list#catalog`. At 390×844, Product/cart/checkout docks were accessible, with no floating Telegram FAB overlap or horizontal overflow. One local cart item was added then removed; no checkout submit was performed. Temporary viewport override was reset.
- F12 is fixed and covered by real local desktop/mobile browser regression (content_manager denied → allowed → Back denied → Forward allowed; forbidden editor does not mount or read settings). Production owner smoke passed. A real production content_manager session was not available: that exact role journey was not repeated live, and no role was provisioned/changed solely for testing.
- Post-rollout Cloud Logging was checked through 18:11:23 UTC for the window beginning 18:04 UTC and found zero ERROR/5xx or order/notification/bag-designer failure events. This is a bounded smoke observation, not a claim of long-term monitoring.
- F01–F17 remain accepted under the requested risk-based policy: unchanged code plus fresh existing regressions and targeted read-only live checks. No new confirmed P0/P1 regression. Live order/PDF/Telegram/AI mutation paths were deliberately not exercised; their evidence remains fresh local integration/emulator tests.

Post-rollout updates to this record, PROJECT_MEMORY and PRODUCTION_OPERATIONS remain a local docs-only diff. Do not push an extra documentation-only commit solely for this record: main push triggers another App Hosting rollout. Include these operational facts in the next authorized application checkpoint. Historical audits are unchanged. Remaining backlog is the separate Customer Identity/Telegram/safe-test workflow above, existing operational alert/cost follow-up and previously deferred content work; no new release blocker.

Final continuation check, 2026-09-09 03:25 UTC: public health still reports `sanpack-build-2026-09-08-002`; workspace HEAD/origin and application patch match the checkpoint. Operator gcloud refresh now requires reauthentication, so Cloud metadata/log results above are the successful post-rollout observations from September 8, not a newly claimed September 9 Cloud check. This does not require another deployment.

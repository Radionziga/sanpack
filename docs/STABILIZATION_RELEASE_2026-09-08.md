# SANPACK final stabilization — 2026-09-08

Status: patch prepared; deployment evidence will be appended after rollout.
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

# Customer identity acceptance fixes R1–R3 — 2026-09-09

Status: **READY FOR INDEPENDENT REVIEW** on a local release candidate. Starting checkpoint: `e9248c068eabdfda8b12da287437aca4a5fb07c4`. The ending hash belongs in the final task handoff because this document is included in that commit. No production operation was performed.

## Fix matrix

| Item | Root cause | Fix |
| --- | --- | --- |
| R1 | Logout swallowed Firestore delete errors, while profile refresh used merge-upsert and could recreate a session deleted after initial authorization. | Logout now returns 503 and leaves the cookie untouched unless revocation is confirmed. New-session profile write and update-only refresh share one Firestore transaction; missing, expired, revoked or mismatched records fail closed. |
| R2 | `ensureTelegramMiniAppSession()` returned a boolean whose false result Profile, History and Checkout ignored before reading the old browser cookie. | Bootstrap is tri-state: `browser`, `authenticated`, `rejected`. Identity-bearing callers stop on `rejected`, clear rendered identity state, show localized retry, and Checkout disables submission. Ordinary browsers retain valid cookie behavior. |
| R3 | Proof-only checkout built `telegram:<id>` directly instead of resolving an existing legacy primary; history and replay then disagreed after login. | Checkout invokes the shared trusted Telegram resolver. Existing legacy UID remains primary; deterministic canonical UID is always a signed/server-derived alias even without a canonical document. History and idempotency accept only those aliases. |

## Session revocation contract

- Every newly issued token has a random `sessionId`; the stored document key is its SHA-256 digest.
- Protected access requires token signature/expiry plus an existing record with matching customer UID, Telegram ID, no revocation marker and future `expiresAt`.
- Profile PUT initially authenticates, then transactionally rechecks the record before profile mutation and update-only refresh. Concurrent delete conflicts/retries and ultimately returns 401; it cannot recreate the record.
- Logout returns success only after delete completes. Firestore failure returns 503 and no cookie-clearing header, so the retained session is represented honestly.
- A new invalid/revoked/expired session never falls through to the legacy bridge because presence of `sessionId` requires a valid record.

## Legacy bridge and rollback

Legacy production cookies have no `sessionId`. They remain accepted until their already-signed maximum 30-day expiry. Profile PUT may update profile data but emits no refreshed cookie. Logout clears the current browser cookie and reports `revocation: legacy_local_only`; a copied token cannot be server-revoked, and the API does not claim otherwise.

Safe bridge removal condition: record when the final old revision stops auth traffic, then wait 30 full days and confirm no rollback/canary issued old-format cookies. A rollback to `0776239` / production build 002 can mint stateless cookies, so it restarts retirement from the next final traffic cutover. Additive session/test collections require no rollback cleanup and security rules remain unchanged.

## Mini App isolation

- No `initData` means ordinary browser mode and permits normal cookie-backed state.
- Valid proof establishes the resolved Telegram identity.
- Rejected proof is not guest mode: Profile, History and Checkout do not call cookie-backed customer/history endpoints; stale rendered state is cleared, and Checkout cannot submit until verification succeeds.
- In-flight requests are account-scoped. Changing `initData` aborts the old request; success cache is per exact proof and reset on logout. Mini App Checkout replaces contact fields with the newly verified profile rather than retaining another account's local state.

## Canonical identity and ownership

The verified Telegram numeric user ID is the cross-flow key. A matching existing customer document remains primary to avoid physical migration. Deterministic `telegram:<id>` plus discovered OIDC/matched UIDs are bounded signed aliases. The canonical alias is included even if no document exists at that path.

Proof-only checkout resolves the same profile before deriving `customerUid`. Idempotency accepts a stored UID only when it belongs to the current server-derived alias set; client UID, aliases, username and phone never grant ownership. Requests and historical snapshots are not rewritten, and different Telegram IDs remain isolated.

## Regression evidence

- Real Route Handlers + Firestore Emulator: delete failure, logout/PUT interleaving, expired/revoked denial, non-renewing legacy bridge, concurrent resolver, real-HMAC proof-only checkout, login/history visibility, alias replay, different-account and forged-field isolation.
- Unit/API: tri-state bootstrap, A→B→A cache behavior, no upsert refresh, new-token/legacy distinction, shared resolver checkout and same-account alias replay.
- Playwright desktop/mobile: ordinary browser cookie, valid Mini App, failed logout, rejected Mini App with stale cookie/local profile across Profile/History/Checkout, safe isolated order smoke.
- Emulator files run without file parallelism because their explicit collection cleanup shares one database; each application concurrency scenario remains concurrent internally.

Final gate results and ending checkpoint are recorded in the task handoff after execution.

## Deployment prerequisites

1. Reauthenticate Firebase CLI/ADC and run the existing read-only aggregate identity audit.
2. Reconfirm production `0776239` / build 002 rollback target and Telegram secret binding without reading values.
3. Verify/apply scoped TTL for `customerSessions.expiresAt`; TTL is cleanup, not correctness.
4. Deploy the exact accepted checkpoint without rules/IAM/schema migration.
5. Smoke one browser/Mini account, one deliberately rejected Mini proof with an existing browser cookie, logout and the isolated order test sink. Do not submit a real order.
6. Record traffic-cutover time for the 30-day bridge retirement clock; reset it after any rollback.

Production writes: **NO**. Real requests: **NO**. Telegram notifications: **NO**. Physical merge/backfill: **NO**. Push/deploy: **NO**.

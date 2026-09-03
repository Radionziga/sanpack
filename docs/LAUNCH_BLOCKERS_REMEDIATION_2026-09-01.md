# SANPACK — Launch Blockers Remediation / Handoff

Дата: 2026-09-01 (Asia/Samarkand). Baseline HEAD: `e07b507029a6be1b750ebea3a55cb77fb56124ff`; включает незакоммиченные fixes исторического security audit и этого этапа.

## Executive status

**READY FOR CONTROLLED ROLLOUT.** Это означает: локальный code/config plan и rollback path готовы, но production ещё работает на прежних revision/rules/IAM/data. Cloud preflight и apply требуют отдельной команды.

| Launch blocker | Code/config plan | Production apply |
| --- | --- | --- |
| SEC-02 Firestore public read | Closed locally | Pending controlled rollout |
| SEC-05 ingress/abuse | Closed without trusted IP dependency | Pending config/monitoring smoke |
| SEC-10 Storage/private attachments | Closed locally | Pending rules/IAM/token audit/apply |
| Owner/IAM/secrets | Deterministic checklist + dry-run tools | Pending operator verification/provisioning |

Remaining P0/P1 at **code/config-plan level: 0**. Manual rollout prerequisites are intentionally not reported as already applied.

## SEC-02 — Firestore

### Options evaluated

- **A, public query + conditional rules:** viable only if every public collection has an enforceable publication field and every query carries matching constraints. It still exposes whole documents (including internal fields), requires special handling/settings projection and creates a second set of query invariants across SSR/API. Rejected for SANPACK now.
- **B, trusted server boundary:** selected. Existing `serverCatalogRepository` remains the single read architecture, but replaces credentialless REST with lazy Admin SDK reads and explicit projection before cache/client serialization. Browser identity is unnecessary; App Hosting runtime IAM is required.
- **C, duplicated public collections/materialized projections:** rejected because it adds synchronization/migration/state without current need.

`lib/catalog/publicProjection.ts` is an explicit allowlist boundary. It returns published structurally valid Products, active Category lineage, active Banners, public Attribute/Client fields and a public SiteSettings projection. Unknown top-level and nested fields, including audit IDs and accidentally added private config, are stripped. Seed mode passes through the same projection. Cache TTL/tags/revalidation remain in the existing repository; cache key is projection/project/seed aware.

`firestore.rules` is deny-all for all direct clients, anonymous or Firebase-authenticated. Admin/customer/public access uses authorized Next APIs; Admin SDK bypass is controlled by handler authorization and runtime IAM. No Product/Category schema or data migration.

Emulator: **26 Firestore checks passed**; published Product, draft Product, hidden Category, settings and private collections all return 403 directly. Public storefront accessibility is tested through projection/unit/E2E, not a raw client rule.

Manual: application revision must be deployed and smoked **before** deny-all rules. Then deploy rules and prove direct REST 403 plus storefront/admin/order success.

## SEC-05 — ingress / abuse

The application no longer trusts `x-appengine-user-ip`, first XFF or `x-real-ip` by default. `TRUSTED_CLIENT_IP_HEADER` is empty in App Hosting. Each launch-critical public scope has a Firestore-transaction whole-store ceiling; forged headers, User-Agent changes, process restarts and direct-origin requests cannot create a new global allowance. Admin AI limits remain UID-based; bag generation retains a separate configurable global daily ceiling.

If a future edge provides a proven single-IP overwritten header with no origin bypass, the operator may set its name. Only one syntactically valid IP is accepted; chains/malformed values fall back to the global-only model. IP therefore improves fairness but is not a security dependency.

Covered flows: orders, callbacks, admin session exchange, Telegram Mini App/start/callback, public bag generate/submit/private-asset reads, admin image/translation UID limits. Body caps remain 256 KB or 24.1 MB bag payload. App Hosting is prepared at 1 CPU / 1 GiB / concurrency 8 / max 10; this reduces per-instance memory amplification and is not a provider billing budget.

Manual: monitor 429s/latency, verify Firestore rateLimits writes/TTL, provider quota and daily ceiling during rollout. Do not set a trusted header on assumption.

## SEC-10 — Storage

Path classification:

- `media/**`: public CMS catalog/category/banner/client/document assets. Storage rules allow **get only**; list/create/update/delete are denied to clients.
- `bag-design-requests/**`: customer/private attachments and AI drafts. All direct client operations denied.
- every other prefix: denied by default.

New bag assets have `private,no-store`, no minted permanent Firebase download token, and are served via `/api/bag-designer/asset`: short-lived HMAC capability for the submitting browser or owner/sales session. Path/MIME/size are checked; response is no-store/noindex/nosniff. Admin API replaces historical Firebase token URLs in output with server URLs. Media Library and its delete endpoint ignore/reject non-public paths.

Storage emulator: **7 checks passed** — public media get allowed; private/unclassified get, list, anonymous upload and delete denied.

Historical permanent tokens can bypass later rules and therefore need inventory after application smoke. `security:private-storage-audit` is read-only by default; apply requires exact bucket confirmation and is postponed until after rollback soak. Current read-only earlier audit found no objects under the private prefix, but production can change before rollout. Bucket IAM must have no `allUsers`/`allAuthenticatedUsers`; rules are not a substitute for a public IAM grant.

## Owner grant

Required `admins/{Firebase UID}` document:

```text
uid: exact Firebase UID
email: normalized verified owner email
name: display name or email
active: true
role: super_admin
createdAt / updatedAt: server timestamps
provisionedBy: explicit-owner-script-v1
```

Dry-run command is documented in PRODUCTION_OPERATIONS. Script requires explicit project/UID/email, verifies one enabled matching Auth user, refuses conflicting grant unless `--replace-existing`, and requires `--apply --confirm-project PROJECT` to write. **Not run against production.**

## Runtime permissions

Runtime identity is expected to be `firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com`. Required capabilities:

- Firestore entity read/list/create/update/delete + transactions (`roles/datastore.user` is the standard runtime role);
- Firebase Auth `users.get` and `users.createSession` (reviewed custom role is least privilege; `roles/firebaseauth.admin` is broader);
- object get/list/create/update/delete on only the configured bucket (`roles/storage.objectUser`, normally included in App Hosting compute runner; verify actual policy);
- access to only the secrets referenced by this backend;
- normal App Hosting logging/monitoring/trace permissions from compute runner.

Current local gcloud and Firebase credentials require reauthentication, so project IAM, bucket IAM/config, backend details, owner grant and Secret Manager grants were **not verified**. This is a manual preflight, not simulated success.

## Secrets and environment

Public runtime configuration: `NEXT_PUBLIC_SITE_URL`, Firebase web config, optional catalog PDF URL, `SANPACK_USE_SEED_DATA=false`, daily generation limit. These values are visible by design even if existing App Hosting configuration references some through Secret Manager.

Server-only: `TELEGRAM_CONFIG_ENCRYPTION_KEY` (required if customer sessions/private assets/integrations operate; stable 24+ random characters). Telegram/Gemini provider credentials stay encrypted in private Firestore settings and integrations can remain disabled. Production uses ADC; do not bind `FIREBASE_SERVICE_ACCOUNT_JSON`. `TRUSTED_CLIENT_IP_HEADER` remains empty unless separately proven.

Exact current bindings:

| Variables | Classification / requirement |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Required public config |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Required public web identifiers; currently Secret Manager references, but not confidential after build |
| `NEXT_PUBLIC_CATALOG_PDF_URL` | Optional public value; current secret reference must exist for rollout or be removed deliberately |
| `SANPACK_USE_SEED_DATA=false` | Required production invariant |
| `BAG_DESIGNER_DAILY_GENERATION_LIMIT` | Required explicit cost ceiling while module can be enabled |
| `TRUSTED_CLIENT_IP_HEADER=""` | Required safe default; optional only after edge proof |
| `TELEGRAM_CONFIG_ENCRYPTION_KEY` | Required server secret for enabled customer/private-asset workflows |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Must be absent on App Hosting; ADC is the runtime identity |
| `GEMINI_SETTINGS_SCOPE` | Optional server identifier; safe default is environment-derived |

## Rollout and rollback

Authoritative ordered procedure is in [PRODUCTION_OPERATIONS.md](PRODUCTION_OPERATIONS.md). Summary: export state → verify IAM/secrets and provision owner → Storage rules → application revision → smoke trusted reads/auth/order/media/private asset → Firestore deny-all rules → repeat smoke/direct-deny proof → soak → optionally strip historical private tokens → close rollout.

Rollback after Firestore deny-all must restore prior Firestore rules **before** returning to the old credentialless-REST application. Storage rollback must never add bucket-wide public IAM. Historical token stripping occurs only after the rollback window; if already stripped, roll forward the private proxy rather than reconstruct tokens.

## Files changed in this remediation

- `lib/repositories/serverCatalogRepository.ts`, `lib/catalog/publicProjection.ts`, `firestore.rules` — trusted read/projection and direct deny.
- `lib/security/distributedRateLimit.ts`, auth routes, `apphosting.yaml`, `.env.example` — global ceilings/safe IP default/runtime envelope.
- `storage.rules`, `lib/media/storagePaths.ts`, `lib/bag-designer/privateAssets.ts`, `/api/bag-designer/asset`, media/bag routes — public/private media boundary.
- `scripts/provision-owner-admin.mjs`, `scripts/audit-private-storage-tokens.mjs` — explicit dry-run operator tools.
- emulator/unit/security tests and architecture/operations/project memory.

## Validation

- `npm test`: **42 files / 368 tests passed**.
- Firestore + Storage emulator: **26 + 7 checks passed**.
- `npm run typecheck`: exit 0, Next typegen + `tsc --noEmit`.
- `npm run lint`: exit 0, no warnings/errors.
- `npm run build`: exit 0, Next 16.3.0, **90 generated routes/pages** including private asset route.
- security E2E: **6 passed** desktop/mobile; full isolated storefront/taxonomy/security/axe suite: **35 passed, 1 intentional mobile skip**.
- `npm audit --omit=dev`: exit 1, **6 moderate, 0 high, 0 critical**; unchanged reviewed Firebase Storage/uuid transitive P2 from historical audit, no dependency mutation.
- `git diff --check`: exit 0.

## Production / Git

Production writes/rules deploy/Storage upload-delete/IAM/grant/secrets/application deploy/push: **none**. Emulator writes only targeted `demo-sanpack-audit` localhost. Branch `main`; HEAD remains `e07b507029a6be1b750ebea3a55cb77fb56124ff`; working tree intentionally dirty with accumulated security work. Unrelated untracked assets, if any, are not part of these launch changes.

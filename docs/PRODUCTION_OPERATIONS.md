# SANPACK — production operations

## Health и наблюдаемость

- `GET /api/health` возвращает только состояние сервиса, revision и время; секреты и состояние клиентов не раскрываются.
- Серверные ошибки критических воронок пишутся как однострочный JSON с `severity`, `event`, `timestamp` и безопасным типом ошибки. Эти события автоматически доступны в Cloud Logging App Hosting.
- Для uptime monitor использовать `/api/health`; alert: 3 последовательных ошибки или p95 ответа выше 2 секунд в течение 5 минут.
- Отдельные alerts: рост `bag_designer.operation_failed`, `order.creation_failed`, `order.notification_failed`, а также дневные расходы Gemini.

## Распределённый rate limit

Публичные мутации и создание сессий используют коллекцию `rateLimits`. В документах хранится только SHA-256 отпечаток клиента внутри ID документа; сырой IP не сохраняется. Окно и счётчик обновляются транзакцией Firestore, поэтому лимит общий для всех экземпляров App Hosting.

TTL policy для поля `expiresAt` collection group `rateLimits` включена в production и имеет state `ACTIVE`. При переносе в другой Firebase project её нужно создать заново. TTL отвечает только за уборку старых buckets и не влияет на корректность лимита.

User-Agent и непроверенные forwarding headers не определяют baseline allowance. Для каждого launch-critical public scope действует whole-store ceiling. `TRUSTED_CLIENT_IP_HEADER` по умолчанию пуст: optional per-IP bucket включается только для одного валидного IP после доказанного edge overwrite/no-origin-bypass; XFF chains отвергаются. Ошибочная настройка не отключает global ceiling.

Anonymous bag designer дополнительно использует глобальный Firestore daily bucket: `BAG_DESIGNER_DAILY_GENERATION_LIMIT`, default **60 attempts/day** для всех instances/IP вместе. Retry тоже тратит allowance; fixed windows могут дать двойную квоту возле границы суток. Владелец должен согласовать лимит и provider quotas; это не денежный billing budget. Admin image generation: 20/hour/UID; translation: 30/hour/UID. При недоступном limiter costly action не выполняется. Malformed/oversized JSON отклоняется до JSON parse (256 KB, bag payload 24.1 MB); это не заменяет ingress body/connection/concurrency limits.

## Production foundation status

Status as of **2026-09-08**: **PRODUCTION STABILIZATION LIVE**. Historical rationale and the foundation
pre-deploy plan remain in [LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md](LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md); the latest rollout evidence is in [STABILIZATION_RELEASE_2026-09-08.md](STABILIZATION_RELEASE_2026-09-08.md); the preceding rollout remains documented in [PRODUCTION_RELEASE_ROLLOUT_2026-09-08.md](PRODUCTION_RELEASE_ROLLOUT_2026-09-08.md).

- Deployed source: `077623902f5a5da6ead798d16cdb4d14b9c5d34e`.
- App Hosting build/rollout: `build-2026-09-08-002` / `rollout-2026-09-08-002` (100% traffic, build `READY`, rollout `SUCCEEDED`).
- Rollback target: `build-2026-09-08-001`, source `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14`; it remains compatible with the unchanged trusted-server security boundary.
- Production domains: `https://sanpack.uz` and
  `https://sanpack--stamply-4df8a.asia-southeast1.hosted.app`.
- Storage ruleset: `c1c6f62a-1377-4c2a-8833-b9c02ee58a08`.
- Firestore ruleset: `404a711f-2e4f-46a6-b0be-0cea21c8ca74`.
- `rateLimits.expiresAt` TTL state: active.
- Customer-history composite index `requests(customerUid ASC, createdAt DESC, __name__ DESC)`: `READY` (ID `CICAgOjXh4EK`).
- Owner grant, runtime IAM and required secret bindings were verified without exposing values.
- Direct Firestore catalog/private reads return 403; trusted SSR/API/admin reads remain operational.
- Public `media/**` remained available; direct list/write/delete and private/legacy paths are denied.
- Authenticated owner admin and private asset proxy were smoke-tested. The currently deployed revision
  still predates the isolated order smoke, so no live order was created during that historical rollout;
  canonical order price/quantity remained covered by the release tests.
- Post-release hard-route, SSR/SEO, navigation/mobile and authenticated Admin smoke passed. The soak
  snapshot contained no severity `ERROR` entries and no critical order/notification/bag-designer
  failure events; observed 404s were external WordPress/CMS probes.

The first attempted App Hosting build (`build-2026-09-04-001`) failed before deployment because an
empty `TRUSTED_CLIENT_IP_HEADER` manifest value is invalid. The binding was removed (unset is the
safe application default), the next build succeeded, and failed build 001 never received traffic.

The sections below remain the authoritative repeatable preflight, rollout and rollback runbook for
future releases; completed checks must be repeated when project, runtime identity or infrastructure
changes.

### Stabilization verification deploy record (2026-09-08)

The accepted Astra-verified release contained no Firestore/Storage schema migration, rules change,
IAM change or new secret binding. The following preflight was completed before traffic moved:

1. Operator identity, backend/branch, rollback revision and 100% pre-release traffic were read back.
2. The missing customer-history index was created by the single-index API workflow, waited to
   `READY`, and exercised with the real query shape before application deployment. No existing index
   was deleted and no rules were deployed.
3. Existing owner grant, runtime IAM, public/server environment, secret bindings, Storage rules and
   deny-all direct-client Firestore rules were reconfirmed without widening permissions.
4. Exact checkpoint `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14` was pushed without force and App Hosting moved 100%
   traffic only after its build became `READY`; production smoke then covered storefront/SSR/SEO,
   owner Admin, mobile fixed actions and read-only security boundaries.
5. No live order/PDF/Telegram mutation was made because production has no suppress/test marker;
   accepted integration/emulator regressions remain the evidence for those mutation paths.

### Customer identity / isolated order smoke preflight (candidate 2026-09-09)

Before deploying the customer identity candidate:

1. Reauthenticate the operator CLI/ADC, then run the read-only, PII-free inventory:
   `npm run identity:audit -- --project stamply-4df8a`. Record only aggregate legacy/duplicate counts;
   do not merge or delete customers automatically.
2. Reconfirm live source `0776239`, rollback build `sanpack-build-2026-09-08-002`, owner grant,
   encryption secret binding, deny-all Firestore rules and current Storage boundary.
3. Deploy the exact reviewed application checkpoint. No Firestore/Storage rules, IAM, secret or catalog
   migration is required. The new collections are server/Admin-SDK only.
4. Apply/verify TTL for `customerSessions.expiresAt` through the scoped Firestore indexes workflow.
   TTL is cleanup, not session correctness; JWT expiry and session-record validation remain authoritative.
5. Smoke browser OIDC and Mini App with one controlled Telegram account. Verify both resolve the same
   profile/history, re-login keeps an edited contact field, logout revokes the current cookie, and an
   invalid/mismatched Mini App proof is rejected.
6. In `/admin/requests`, run **Безопасный smoke test** with a published product. Confirm `TEST-*`,
   canonical price, `notification.status=suppressed`, no document in `requests`, and no Telegram message.
   Delete that one test through its exact UI/API confirmation after evidence is recorded.
7. Do not use public query/body flags to suppress notifications: `/api/requests` rejects them. A real
   order remains live and always selects notification configuration on the server.

Rollback is application-only to `0776239`/build 002. New `customerSessions` and isolated test records
are additive and ignored by the rollback revision; no rules rollback or data deletion is needed.

> **Storage ownership decision 2026-09-04.** The owner confirmed that the
> experimental `vetclinics` backend is discontinued. The default bucket
> `stamply-4df8a.firebasestorage.app` is the SANPACK production Storage boundary;
> its old vetclinics rule namespaces are not an active contract. Read-only
> inventory found 252 objects, all under `media/**`, and no legacy or private
> objects. SANPACK-only Storage rules were deployed and verified: public media
> get remains available while list/write/delete/private/legacy paths are denied.
> Physical deletion of any other legacy cloud resources remains a separate task.

### Mandatory preflight (read-only except explicit owner provisioning)

1. Restore operator authentication; do not reuse a personal service-account JSON in production.
2. Verify the App Hosting runtime principal:
   `firebase-app-hosting-compute@PROJECT_ID.iam.gserviceaccount.com`.
   It needs `roles/datastore.user`, Firebase Auth permissions
   `firebaseauth.users.get` + `firebaseauth.users.createSession` (a reviewed custom role is preferred;
   `roles/firebaseauth.admin` is broader), and bucket-scoped
   `roles/storage.objectUser`. App Hosting's `roles/firebaseapphosting.computeRunner`
   already includes objectUser today, but verify actual bindings rather than assuming.
3. Verify per-secret accessor grants for every `secret:` entry in `apphosting.yaml`.
   `TELEGRAM_CONFIG_ENCRYPTION_KEY` is required for customer sessions/private asset signatures
   and encrypted Telegram/Gemini config. Never rotate it without a session/config re-encryption plan.
4. Verify the owner Firebase Auth user, then dry-run:
   `npm run security:owner-grant -- --project PROJECT --uid UID --email EMAIL`.
   Only after reviewing output, rerun with
   `--apply --confirm-project PROJECT`; add `--replace-existing` only after inspecting a conflicting
   grant. The script refuses UID/email mismatch, disabled users, nested IDs, ambiguous project and
   writes by default. Complete this **before** deploying the new auth code.
5. Read bucket IAM/config and require no `allUsers` or `allAuthenticatedUsers` binding/object ACL.
   Keep public delivery controlled by Storage rules/download tokens, not bucket-wide IAM.
   Run read-only `npm run security:private-storage-audit -- --project PROJECT --bucket BUCKET`.
6. Keep `TRUSTED_CLIENT_IP_HEADER` unset in App Hosting. The manifest intentionally omits it because
   App Hosting rejects empty env values; absence is the safe application default. App Hosting
   documentation does not establish a header overwrite/no-direct-origin contract. Whole-store public
   ceilings work without IP. Only configure one single-IP header after a separately evidenced edge contract.

Read-only verification examples (replace placeholders; inspect output, do not pipe secrets):

```bash
gcloud projects get-iam-policy PROJECT --flatten='bindings[].members' \
  --filter='bindings.members:firebase-app-hosting-compute@PROJECT.iam.gserviceaccount.com' \
  --format='table(bindings.role)'
gcloud storage buckets describe gs://BUCKET \
  --format='yaml(iamConfiguration.uniformBucketLevelAccess,iamConfiguration.publicAccessPrevention)'
gcloud storage buckets get-iam-policy gs://BUCKET --format='yaml(bindings)'
npx firebase apphosting:backends:get BACKEND --project PROJECT --json
npm run security:owner-grant -- --project PROJECT --uid UID --email EMAIL
npm run security:private-storage-audit -- --project PROJECT --bucket BUCKET
```

Also inspect project-level IAM for `allUsers`/`allAuthenticatedUsers`; a bucket-only policy may omit
inherited grants. If uniform bucket-level access is off, audit object ACLs before rollout.

Public/non-secret config: site URL and Firebase web config, optional PDF URL, seed flag=false and
generation ceiling. Server secrets: encryption key; App Hosting bindings currently also wrap public
Firebase web identifiers/PDF URL, which is permitted but does not make them confidential. Optional
Telegram/Gemini integration values live encrypted in Firestore and may remain disabled/missing.

### Safe rollout order

1. Export current Firestore/Storage rules, current App Hosting revision ID and current bucket/IAM
   state for rollback. Do not print secret values or private attachment URLs.
2. Complete preflight above and create/confirm owner grant.
3. Deploy **Storage rules first**. Existing `media/**` downloads remain allowed; writes/list/private
   paths close. Existing private Firebase token URLs may still work until tokens are removed, so no
   new privacy claim yet.
4. Deploy the application revision. Before Firestore rules change, verify health, public
   `/api/catalog?resource=products`, four-locale storefront, owner login, admin catalog read,
   test order, media public read, new bag asset signed read and admin read. App uses Admin SDK and
   explicit public projection, so it is compatible with both old and deny-all Firestore rules.
5. Deploy deny-all Firestore rules. Verify direct anonymous REST get/list is 403, while storefront,
   metadata/sitemap/catalog API/admin/order still work.
6. Soak the new revision. Then rerun private-token audit; only with separate approval use
   `--apply --confirm-bucket BUCKET` to remove historical bag-design permanent tokens. Verify old
   requests through the server asset route. Token cleanup is intentionally after the rollback window.
7. Verify monitoring, rate-limit writes/TTL, Gemini daily ceiling, Telegram notifications and no
   unexpected 401/403/503. Only then mark production foundation closed.

Apply commands are intentionally kept out of preflight automation. On the separately authorized
rollout use scoped targets (`npx firebase deploy --only storage --project PROJECT`, then later
`npx firebase deploy --only firestore:rules --project PROJECT`) and the App Hosting rollout UI/CLI;
never use an unscoped `firebase deploy` for this sequence.

Never deploy Firestore deny-all before the trusted-server application revision. Never deploy auth
before an owner grant. Never strip historical private tokens before the new asset route has been
smoked and the rollback window has passed.

### Rollback

- Before Firestore rules apply: move traffic to the previous App Hosting revision; public reads still work.
- After deny-all rules apply: first restore the exported previous Firestore rules, verify the old
  public REST catalog, then move traffic to the previous application revision.
- Storage/application failure: restore the exported Storage rules only if necessary for the old
  application, then previous revision. Do not re-open bucket-wide IAM. If historical tokens were
  already removed, roll forward the private proxy rather than trying to reconstruct secret tokens.
- Owner lockout: do not weaken auth. Correct the explicit `admins/{uid}` grant using the reviewed script.


## Release gate

1. `npm ci`
2. `npm ls --depth=0`
3. `npm test`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run build`
7. `npm run test:e2e`
8. `git diff --check`

Security-specific gates (без production writes):

```bash
npx firebase emulators:exec --only firestore,storage --project demo-sanpack-audit --config firebase.security-test.json 'node tests/security/firestore-rules-smoke.mjs && node tests/security/storage-rules-smoke.mjs'
npx playwright test --config=playwright.taxonomy.config.ts
npm audit
npm audit --omit=dev
```

Firestore emulator требует 403 для всех anonymous/authenticated direct reads/writes, включая published/draft/settings. Storage emulator разрешает только public `media/**` get и запрещает private get, list, upload/delete. Storefront доступ проверяется отдельно через trusted server projection; emulator не доказывает production IAM/rules apply. Isolated taxonomy E2E подменяет admin identity/read и блокирует cloud access.

GitHub Actions выполняет тот же quality gate и отдельный Chromium desktop/mobile + axe smoke. E2E работает с `SANPACK_USE_SEED_DATA=true` и не пишет в Firebase, Storage, Telegram или Gemini.

## Осознанно отложено

- Production alerts/cost dashboards remain an operational follow-up. After the candidate is deployed,
  use the isolated admin smoke above; do not create a real order or real Telegram notification merely
  to satisfy a checklist.
- Historical public `media/**` download tokens remain intentionally valid because these are public
  SANPACK assets. No `bag-design-requests/**` objects or private tokens existed during rollout.
- Physical cleanup of the discontinued `vetclinics` backend and any non-Storage cloud resources is a
  separate owner-approved operation. No legacy Storage objects were found.
- Production taxonomy mapping, content migration and deferred product features were not part of the
  rollout.

## Final F12 patch rollout

Release record: [STABILIZATION_RELEASE_2026-09-08.md](STABILIZATION_RELEASE_2026-09-08.md). The application-only patch requires no rules/index/schema/IAM/secret changes. Preflight reconfirmed `build-2026-09-08-001` at 100% as the compatible rollback target. `main` is the configured rollout branch: complete all gates and rollback preparation before push, inspect any automatically created build/rollout, and avoid dispatching a duplicate. Use the exact checkpoint hash if an explicit App Hosting rollout is needed. Roll back through App Hosting to build 001 without changing the current Firestore/Storage rules. Post-rollout documentation can remain a local docs-only diff until a subsequent application release to avoid an extra deployment.

Completed: checkpoint `0776239` was pushed normally to main, triggering build/rollout 002 automatically. It is READY/SUCCEEDED at 100%; health revision is `sanpack-build-2026-09-08-002`. F12, gates, live smoke and verification limits are recorded in the linked release record. No migration or infrastructure/data mutation occurred.

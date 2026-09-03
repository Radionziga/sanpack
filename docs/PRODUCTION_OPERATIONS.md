# SANPACK — production operations

## Health и наблюдаемость

- `GET /api/health` возвращает только состояние сервиса, revision и время; секреты и состояние клиентов не раскрываются.
- Серверные ошибки критических воронок пишутся как однострочный JSON с `severity`, `event`, `timestamp` и безопасным типом ошибки. Эти события автоматически доступны в Cloud Logging App Hosting.
- Для uptime monitor использовать `/api/health`; alert: 3 последовательных ошибки или p95 ответа выше 2 секунд в течение 5 минут.
- Отдельные alerts: рост `bag_designer.operation_failed`, `order.creation_failed`, `order.notification_failed`, а также дневные расходы Gemini.

## Распределённый rate limit

Публичные мутации и создание сессий используют коллекцию `rateLimits`. В документах хранится только SHA-256 отпечаток клиента внутри ID документа; сырой IP не сохраняется. Окно и счётчик обновляются транзакцией Firestore, поэтому лимит общий для всех экземпляров App Hosting.

В Firebase Console нужно один раз включить TTL policy для поля `expiresAt` коллекции `rateLimits`. TTL отвечает только за уборку старых buckets и не влияет на корректность лимита.

User-Agent и непроверенные forwarding headers не определяют baseline allowance. Для каждого launch-critical public scope действует whole-store ceiling. `TRUSTED_CLIENT_IP_HEADER` по умолчанию пуст: optional per-IP bucket включается только для одного валидного IP после доказанного edge overwrite/no-origin-bypass; XFF chains отвергаются. Ошибочная настройка не отключает global ceiling.

Anonymous bag designer дополнительно использует глобальный Firestore daily bucket: `BAG_DESIGNER_DAILY_GENERATION_LIMIT`, default **60 attempts/day** для всех instances/IP вместе. Retry тоже тратит allowance; fixed windows могут дать двойную квоту возле границы суток. Владелец должен согласовать лимит и provider quotas; это не денежный billing budget. Admin image generation: 20/hour/UID; translation: 30/hour/UID. При недоступном limiter costly action не выполняется. Malformed/oversized JSON отклоняется до JSON parse (256 KB, bag payload 24.1 MB); это не заменяет ingress body/connection/concurrency limits.

## Controlled security rollout prerequisites

Code/config plan status: **READY FOR CONTROLLED ROLLOUT**, not deployed. Full rationale:
[LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md](LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md).

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
6. Keep `TRUSTED_CLIENT_IP_HEADER` empty. App Hosting documentation does not establish a header
   overwrite/no-direct-origin contract. Whole-store public ceilings work without IP. Only configure
   one single-IP header after a separately evidenced edge contract.

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

- Code/config launch blockers закрыты; cloud owner/IAM/secrets/rules и controlled smoke остаются обязательной rollout процедурой, не post-launch backlog.
- Production alerts, Firestore TTL и HTTPS security headers проверяются после подключения реального App Hosting environment.
- Backup/export Firestore и rollback rehearsal выполняются перед первым production rollout.

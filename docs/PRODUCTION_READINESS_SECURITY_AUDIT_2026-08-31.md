# SANPACK — Production Readiness & Security Audit / Handoff

> Historical audit snapshot. Findings SEC-02/05/10 subsequently remediated in local code/config plan; see [LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md](LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md). This document intentionally preserves the original findings and does not claim production rollout.

Дата начала: 2026-08-31, завершение: 2026-09-01 (Asia/Samarkand). Source baseline: `main`, `e07b507029a6be1b750ebea3a55cb77fb56124ff` (`feat: harden catalog commerce and taxonomy foundation`), изначально clean. Report описывает **локальное незакоммиченное рабочее дерево**, а не уже deployed исправления.

## Task / Initial state

Независимый от product features контроль production/security границ завершённого catalog/commerce/taxonomy foundation. Прочитаны PROJECT_MEMORY, ARCHITECTURE, CATALOG_COMMERCE_ARCHITECTURE, PRODUCTION_OPERATIONS; проверены все 22 API route files, auth, rules, repositories, order service, integrations, media, configuration, dependencies. Код — source of truth. P2/backlog не реализовывался.

Исходная модель: public catalog читает Firestore REST с web config без Admin SDK; server API используют Admin SDK; Firebase identity предназначалась для admins, Telegram — для customers. Но сервер выдавал любому Firebase user с email super_admin. Catalog read rules были безусловными, а browser writes/admin request reads опирались только на существование active admin record, без серверной validation/role policy.

## Executive summary

**NOT READY FOR DEPLOY**.

| Severity | Found | Fixed locally | Remaining |
| --- | ---: | ---: | ---: |
| P0 | 2 | 1 | 1 |
| P1 | 8 | 6 | 2 |
| P2 | 5 | 0 | 5 |

Группировка по root cause, не по числу затронутых endpoints. Частично исправленный SEC-05 считается remaining. SEC-10 — production-readiness uncertainty с подтверждённым anonymous listing, **не утверждение о доказанной утечке частных вложений или unauthorized writes**. Fixed означает local code/config + tests; ни одно изменение не применено на production.

Launch gates: SEC-02 public draft boundary; SEC-05 trusted ingress/abuse configuration; SEC-10 Storage permissions/privacy verification. Дополнительно до rollout нужны проверенные owner grants/runtime IAM и отдельное разрешение на применение подготовленных rules. Успешный build не закрывает эти условия.

## Findings

### SEC-01 — P0 — Firebase identity автоматически повышалась до super_admin — FIXED LOCALLY

- Files: `lib/auth/adminAuthorization.ts`, `lib/auth/server.ts`, `app/api/auth/session/route.ts`.
- Сценарий: любой валидный Firebase account с email, в том числе обычный account при доступной регистрации/provider, мог обменять ID token на административную session. UI регистрации нет, но отсутствие кнопки не ограничивает Firebase API. Production signup-policy не менялась и создание тестового account не выполнялось.
- Impact: полный catalog/settings/integration/order/media access через Admin SDK, обходящий rules.
- Fix: существующая `admins/{uid}` — явный grant с `active: true` и ролью из уже существующего UserRole. Проверяется каждый запрос, а не копируется навсегда в cookie. Missing/malformed/disabled grant и read failure → deny. Никакого automatic bootstrap/email-domain fallback. Session revocation проверяется; local-token cookie не принимается в production.
- Compatibility prerequisite: подтвердить/создать grant владельца отдельным authorized operation до rollout. Это не Product/Category migration. В этом аудите grant writes не было; ADC read не удался.

### SEC-02 — P0 — прямое чтение draft/hidden/internal catalog fields — NOT FIXED

- Files: `firestore.rules`, `lib/repositories/serverCatalogRepository.ts`, `lib/catalog/publicProducts.ts`.
- Сценарий: anonymous REST collection/document read получает весь документ Product независимо от status. Аналогично hidden Categories/inactive Banners. Public endpoint фильтрует published Products, но не защищает исходные документы.
- Impact: черновики, неопубликованные цены/контент и любые внутренние поля этих документов доступны напрямую. `settings/global` также public whole-document: private поля туда класть нельзя.
- Evidence: emulator fixture draft Product и hidden Category дают 200 anonymous. Live read: 238 Products, все published; 27 Categories, все active. Фактических live drafts при проверке нет; тест не создавал их в production. Live Product field names включают updatedBy/createdBy, не только storefront presentation fields.
- Почему не исправлено: текущий credentialless REST reader получает коллекции целиком. Изменение rules без изменения согласованной read/query/projection стратегии остановит storefront. Решение требует отдельного review/rollout, а не произвольного внедрения новой collection здесь. Public read часть rules сознательно сохранена; deploy не разрешён до закрытия.

### SEC-03 — P1 — missing role checks и обход validation через альтернативные writes — FIXED LOCALLY

- Files: `app/api/admin/**`, `firestore.rules`.
- Сценарии: viewer мог редактировать orders/integrations; content role мог менять operational settings; active admin Firebase token напрямую писал catalog/изменял или удалял requests без API validation/audit. Generic data action `updateRequestStatus` можно было совместить с другим resource для raw update. ID допускал вложенный document path. Production seed action массово перезаписывал существующие документы.
- Fix: existing roles реально проверяются сервером; settings/integrations owner-only, orders owner/sales, media/AI owner/content. Generic CMS writes остаются owner-only. Удалён raw update action; IDs ограничены одним сегментом; settings только save global; production seed запрещён. Requests нельзя редактировать generic data API. Force media deletion owner-only.
- Local rules закрывают browser writes во всех managed collections и прямое чтение orders/admin grants. Server Admin SDK API продолжает работать, credentialless catalog reads не затронуты. Rules rollout **не выполнен**; local tests не доказывают закрытие direct-write bypass на live backend. Deployed privileged rules отдельно не выгружены через operator credentials.

### SEC-04 — P1 — session/login CSRF и неполная cookie policy — FIXED LOCALLY

- Files: `proxy.ts`, `lib/security/requestOrigin.ts`, auth session/customer/Mini App routes.
- Сценарий: session exchange принимал JSON без Origin validation; same-site чужой subdomain мог направлять cookie mutations. За reverse proxy customer cookie Secure зависел от внутреннего request protocol.
- Fix: unsafe methods admin/auth API требуют same/configured Origin, `null`/missing/foreign origin rejected; cookie-authenticated checkout также защищён. Session handler проверяет Origin дополнительно и требует auth_time в пределах 5 минут. Production customer cookies Secure независимо от backend HTTP; HttpOnly/SameSite=Lax сохранены.
- OAuth GET callback остаётся доступным и проверяет signed flow state/PKCE. No-cookie guest checkout API не закрыт. Не вводилась новая session/RBAC platform.

### SEC-05 — P1 — abuse/cost boundaries — PARTIALLY FIXED, STILL OPEN

- Files: `lib/security/distributedRateLimit.ts`, `lib/security/readJsonBody.ts`, public mutations, admin Gemini routes, `.env.example`, `apphosting.yaml` (reviewed, not changed).
- Confirmed bug: смена User-Agent создавала новый rate bucket. Public generation была ограничена только легко меняемым fingerprint. JSON schema bounds применялись после неограниченного parse.
- Fix: User-Agent исключён; counters shared Firestore transactions, rejected attempts больше не увеличивают write counter. Admin AI ограничен UID (image 20/hour, translation 30/hour). Public bag generation имеет shared 60 attempts/day default через существующий limiter, override `BAG_DESIGNER_DAILY_GENERATION_LIMIT`; retry consumes allowance. Ограничено чтение JSON до parse: 256 KB, bag designer 24.1 MB. Failures limiter не пропускают costly action.
- Remaining: `x-appengine-user-ip`/первый XFF/`x-real-ip` всё ещё доверяются без доказанного edge contract. Подмена заголовков может обойти per-client limits orders/callback/login. Общий AI cap не устраняет order spam/Firestore costs и может быть исчерпан злоумышленником. Нужна проверка/настройка ingress stripping и запрет bypass прямым backend URL; guessing числа proxy hops не внедрялось.
- До public AI launch проверить provider quotas, budgets и load envelope: текущие 512 MiB/concurrency 80 не являются load-tested конфигурацией для 24 MB image payloads. Ingress connection/body/rate controls обязательны; новая caching/WAF subsystem не создавалась.

### SEC-06 — P1 — active/unvalidated media и fail-open deletion safety — FIXED LOCALLY

- Files: `lib/media/prepareUpload.ts`, `storageService.ts`, `mediaUsageScanner.ts`, admin media route.
- Сценарии: general upload публиковал SVG/GIF как есть; decoder failure оставлял произвольные исходные bytes с заявленным MIME. Usage scan подавлял ошибки, проверял неправильный document-settings path и только 200 bag requests, после чего позволял удалить якобы unused media.
- Fix: supported images реально декодируются, SVG/GIF rasterize в WebP, max 40M pixels; invalid bytes не сохраняются fallback'ом. PDF signature check и attachment disposition; extension не берётся из произвольного имени. Existing preset crop flow сохранён. Usage scan теперь fail-closed, читает backofficeSettings/documents, не ограничивается выборкой bag requests. Force только owner.
- Limits: PDF check — не антивирус и не полная PDF validation; старые assets не переписывались. Bucket-level privacy и permissions см. SEC-10. Deletion всё ещё работает внутри configured bucket; это не отдельный tenant/private-media isolation engine.

### SEC-07 — P1 — request-price мог сохранять устаревшую цену, duplicate lines обходили maximum — FIXED LOCALLY

- Files: `lib/commerce/productOffer.ts`, `lib/validation/order.ts`, order/API tests.
- Evidence: новый real-handler test показал `priceMode=request, price=123` → сохранённая цена 123. Отдельные одинаковые строки позволяли превысить maximumOrder суммарно.
- Fix: общий order-price helper возвращает undefined для request/informational mode; это действует и в cart, и в server snapshots. Дубли одной Product/Variant configuration в public checkout запрещены. Разные варианты одного Product допустимы. IDs не допускают nested paths.
- Existing server authority сохранён: текущая DB price, variant, tiers, minimum/step/maximum; comparison amount не используется в итогах. Клиентские totals/prices/tiers отвергаются strict schema. Новой commerce модели нет.

### SEC-08 — P1 — upstream error messages/causes могли попасть в logs — FIXED LOCALLY

- Files: `lib/observability/logger.ts`, API integration/auth/media handlers, bag settings/media storage.
- Сценарий: SDK/network errors могут содержать request URL с token или чувствительные provider details; raw console.error/error.message не гарантируют redaction.
- Fix: критические server handlers используют structured logError без upstream message/stack/cause. Safe type + fixed event/context сохраняются; public API error messages остаются generic/классифицированными, не raw stack. Batch media errors не возвращают raw SDK message.
- Старые production logs не читались/не удалялись; факт прошлой утечки не доказан, предотвращён риск новых записей.

### SEC-09 — P1 — private/utility indexing и неявная API cache policy — FIXED LOCALLY

- Files: `next.config.ts`, security E2E.
- Customer/profile/orders/request и utility search/favorites/print не имели общего явного noindex. Это риск неправильной индексации utility shell, не доказанная утечка customer data: API history уже требовала identity.
- Fix: `X-Robots-Tag: noindex, nofollow`; API также `private, no-store`. Existing admin layout noindex сохранён. Tagged repository cache не отключён. Robots — не auth control; sitemap published filtering сохранён. Полного SEO audit не было.

### SEC-10 — P1 — Storage security configuration не установлена как проверяемый invariant — NOT FIXED

- Components: deployed Firebase Storage rules, bucket IAM, media/bag-designer workflows; в repo Storage rules отсутствуют.
- Read-only evidence: anonymous bucket list → 200. `bag-design-requests/` → 200 с пустым списком; утечка текущих customer attachments не подтверждена. IAM/admin grant read через ADC не удался (`ADC requires reauthentication`). Anonymous upload/delete **не пробовали**.
- Risk: bucket содержит public catalog media и предназначен для customer-generated design assets. Нельзя подтвердить deny-anonymous-write/list/private-prefix isolation или отсутствие публичного IAM grant по одному успешному storefront download. Download tokens являются bearer URLs, не доказательством недоступности listing/metadata.
- Required: отдельно получить deployed rules/IAM, определить public/private prefixes и проверить policies в emulator/staging; согласовать безопасный rollout без поломки existing media URLs. Гадать правила и применять их к рабочему bucket запрещено.

### SEC-11 — P2 — dependency advisories — NOT FIXED

- `npm audit`: 13 package nodes (2 high, 11 moderate); `--omit=dev`: 6 moderate, 0 high/critical. Это не 13 независимых exploitable bugs.
- Production цепочка firebase-admin → @google-cloud/storage → retry-request/teeny-request/gaxios → uuid. Advisory касается v3/v5/v6 с supplied buffer; проверенные consumers вызывают v4() без буфера. Reachable attacker-controlled use vulnerable API не найден.
- High brace-expansion/js-yaml находятся в dev/tooling (ESLint/Firebase tooling и транзитивные зависимости), не public request parsing. Hono/OpenTelemetry/re2 warnings тоже tooling. Не передавать недоверенные build configs/globs/YAML и не открывать dev tooling публично.
- Автоматический suggested fix предлагает major downgrade firebase-admin до 10.3.0 и Firebase CLI до 14.x; не применялся. package.json/lock не менялись. Отдельный targeted dependency maintenance, не mass upgrade в этом аудите.

### SEC-12 — P2 — order operational concurrency/idempotency — NOT FIXED

Public order POST не имеет idempotency key: повтор после потерянного ответа может создать duplicate request. Admin read-modify-write audit arrays могут потерять конкурентную запись; PDF GET дописывает audit. Это quote/request workflow без платежей, не payment double-charge. Новая order subsystem не строилась; next review должен учесть низкочастотную текущую работу и concurrency.

Customer history возвращает полный собственный RequestOrder (включая audit actor labels/notification metadata), а не отдельный минимальный customer DTO. Чужие orders недоступны, но customer-facing projection стоит отдельно согласовать.

### SEC-13 — P2 — asset retention и admin full scans — NOT FIXED

Failed/abandoned generated assets требуют отдельной lifecycle cleanup policy; существующий dry-run inspector не является автоматическим retention. Media library/usage scan читает коллекции/бакет целиком, теперь не выдаёт incomplete scan за safety. При росте нужна измеренная pagination/retention strategy. Вложения/старые файлы в этом аудите не удалялись.

### SEC-14 — P2 — observability и defense-in-depth follow-up — NOT FIXED

Health — liveness, не readiness Firebase/Storage/secret bindings. Cloud alerts/backup/rollback rehearsal не проверены административным доступом. CSP/MFA/session hardening beyond current policy и stronger error categorization требуют отдельного согласования; новый SaaS не подключался. Firestore TTL полезен для уборки buckets, но не нужен для математической корректности лимита. Не путать с обязательными launch prerequisites SEC-02/05/10.

### SEC-15 — P2 — inherited keys в catalog resource lookup — NOT FIXED

`app/api/catalog/route.ts` использует `resource in resources`, а не own-property check. Например, constructor/toString могут пройти lookup и дать неожиданный пустой/строковый ответ, другие prototype keys — generic 503. Это не arbitrary collection access и не раскрывает private data. Рекомендуется targeted validation cleanup после launch; P2 код в этом аудите не менялся.

## API authorization inventory

Проверены все 22 route files. Таблица описывает состояние **после local fixes**. Auth/role находятся в handlers; proxy добавляет Origin guard, а не заменяет authorization.

| Route | Methods / access | Validation / side effects |
| --- | --- | --- |
| /api/admin/data | GET admin (requests только owner/sales); POST owner | Resource/action schema, relationship checks, single-segment ID; SDK CMS write; prod seed denied |
| /api/admin/media | GET/POST owner/content; DELETE owner/content, force owner | MIME/size/decoder; Storage upload/delete, usage guard |
| /api/admin/orders/[orderId] | PATCH owner/sales | Strict action/order schema, intentional admin price override, audit |
| /api/admin/orders/[orderId]/document | GET owner/sales | PDF, private/no-store; appends audit (SEC-12) |
| /api/admin/document-settings | GET/POST owner | Strict schema, backofficeSettings/documents |
| /api/admin/telegram | GET/POST owner | Redacted settings; validated save/test/menu; outbound Telegram privileged |
| /api/admin/gemini | GET/POST owner | Redacted settings/model list/save; server API key |
| /api/admin/gemini/product-image | POST owner/content | Bounded JSON, schema, role + UID quota, Gemini call |
| /api/admin/gemini/translate | POST owner/content | Bounded JSON, schema, role + UID quota, Gemini call |
| /api/admin/bag-designer | GET owner/sales; POST status owner/sales, settings owner | Schema; SDK operational settings/status |
| /api/auth/session | POST anonymous entry, verified Firebase identity + grant required | Origin, recent auth_time, rate limit, secure session cookie |
| /api/auth/logout | POST | Origin; clears admin cookie |
| /api/auth/customer | GET/PUT customer session; DELETE logout | Public GET returns unauthenticated if absent; strict profile update, own UID; secure cookie |
| /api/auth/telegram/start | GET anonymous | Sanitized return path, signed PKCE flow cookie; settings read, no paid generation |
| /api/auth/telegram/callback | GET signed flow/state + verified OIDC identity | Code exchange/JWKS issuer/audience; customer upsert/session |
| /api/auth/telegram/mini-app | POST signed initData | HMAC/timing-safe compare/auth_date, rate limit, customer upsert/session |
| /api/requests | GET customer own history; POST guest/customer | Bounded strict input, rate limit, canonical DB snapshots, create + notification |
| /api/callbacks | POST guest | Bounded name/phone input, rate limit, callback create |
| /api/bag-designer | POST guest capability workflow | Generate rate + shared budget; submit hashed secret + atomic state; SDK asset/request writes |
| /api/catalog | GET public | Repository resources, published Product filter; cached DB reads; no mutations |
| /api/catalog/pdf | GET public | Validated locale, local print redirect, not privileged PDF export |
| /api/health | GET public | Minimal liveness JSON, no DB access |

Не найден endpoint с arbitrary **collection/bucket selection**. Admin data больше не допускает вложенный document ID/raw update action. Некоторые signed-provider/legacy records всё ещё приводятся TypeScript cast, не каждый read — полная Zod model validation; это не заявляется закрытым универсальным schema registry.

## Authentication / Telegram

- Public Firebase registration UI нет; cloud provider signup policy не подтверждена read-only. Новый grant check делает произвольный Firebase account недостаточным независимо от наличия регистрации.
- Firebase session: server signature + revocation, active role lookup; HttpOnly/Secure/Lax. Local ID-token fallback только non-production. Firebase client persistence осталась прежней; не проводился отдельный device/session management redesign.
- Telegram OAuth: fixed endpoints, PKCE, signed state cookie, JWKS issuer/audience/algorithm проверка; sanitization returnTo. Mini App: HMAC по bot token, timingSafeEqual, age ≤1 hour. Signed customer JWT использует purpose-derived server key.
- Phone — contact field, не credential. История по signed customerUid; передача phone не даёт доступ. Invalid Mini App data в checkout становится guest checkout, не authenticated identity.
- Live Telegram login/notification/menu и Gemini generation не запускались: они создают state/расходы. Token secrets в privateSettings encrypted AES-GCM; admin GET отдаёт indicators/last4, не secret/ciphertext.

## Orders / Runtime behavior / Compatibility

HTTP tests проходят real POST handler → current mocked Firestore Product → canonical snapshots → saved request. Проверены forged price/total/tier, unknown Product, invalid/missing Variant, draft/archived, informational, quantity 0/negative/below min/off-step/above max, duplicate configuration, variant tiers/max, request mode и comparison vs sale.

2 kg package за 66 000 сохраняется как 1 package, unitPrice/total 66 000, не 33 000. Новые security guards не меняют quantity/packaging/variants/taxonomy модель. Product hidden state — draft/archived; отдельного Product visibility boolean нет. Скрытие Category остаётся merchandising/navigation policy, **не** запрет заказа published Product по ID и не confidentiality boundary. Inventory reservation/stock decrement не добавлялись.

Admin может намеренно менять negotiated order prices через защищённый owner/sales endpoint; это не доверие customer total. Existing IDs/slugs/assets/attributes/related/localization сохранились. Старым Product не требуются новые поля. Меняется только обработка уже существующего request/informational mode и недопустимых/дублированных public inputs.

## Firestore / Secrets / Storage

Live anonymous read-only результаты: products 200 (238 published), categories 200 (27 active), settings/global 200 (top fields company/design/id/update metadata); requests/privateSettings Telegram+Gemini/admins/bagDesignRequests — 403. Не выводились содержимое private records, персональные данные, ключи или tokens.

Repository scan: baseline 1 376 tracked files, только `.env.example` отслеживается; secret signatures и actual local server encryption-key value не найдены. Browser bundle `.next/static`: 87 files, actual private env value matches 0. Firebase web IDs/public key/каталожные download URLs — не service-account credentials. Private config не импортируется client components (`server-only`); public settings merge сам по себе **не secret scrubber**. История всех Git commits и исторические cloud logs не считались полностью проверенными.

Storage upload/deletion не вызывались. Anonymous listing подтверждён; Storage rules/IAM не проверены полностью. ADC requests к admins и bucket policy завершились reauthentication error. Новые изображения безопаснее, но это не исправляет bucket policy автоматически.

Ошибка ADC относится к локальным audit credentials; она **не доказывает отказ production App Hosting service account**. Версионированные Firestore rules проверены emulator; полная deployed configuration не выгружена.

## Validation / XSS / indexing

Product/Category/Attribute/SiteSettings и critical mutations используют существующие schemas; strict customer order payload не принимает price/totals. Text/SEO рендерятся React text. Единственный storefront JSON-LD insertion экранирует `<`; удалённого HTML editor/unsafe raw description injection не найдено. Map iframe ограничен HTTP(S); PDF renderer блокирует remote URL access и local files кроме разрешённых bundled fonts. No SSRF-capable arbitrary URL fetch endpoint найден в проверенных handlers.

Contact social URL validation шире HTTP-only, но текущие React href не являются raw HTML; отдельный phishing/URL allowlist redesign не делался. Signed redirects используют sanitized localized path. Admin noindex сохранён, utility/API noindex проверен actual Next HTTP headers. Sitemap берёт application published Products/visible Category lineage; это не исправляет Firestore read rules и не full SEO review.

## Fixed / Data model / Files changed

Новых persistent Product/Category/Attribute/Variant/StoreConfig entities нет. Использована существующая admins collection и UserRole. Добавлен только optional server env daily AI cap; rate-limit helper принимает server-owned identity для UID/global buckets.

- Auth: `lib/auth/{adminAuthorization,server}.ts`, auth handlers, `proxy.ts`, new `lib/security/requestOrigin.ts`.
- API: existing admin handler role guards, generic data action/ID constraints, bounded public/AI JSON, safe logs; no new public endpoint.
- Commerce: `lib/commerce/productOffer.ts`, `lib/validation/order.ts` — исключительно SEC-07/input safety.
- Media: new `lib/media/prepareUpload.ts`, storageService/mediaUsageScanner/admin media.
- Ops: `lib/security/distributedRateLimit.ts`, new readJsonBody helper, observability logger, Next headers, `.env.example`, local `firestore.rules`.
- Tests: auth authorization/session/login/Telegram; real-handler API authorization/orders; media/Origin/JSON/rate-limit/logging; Firestore emulator smoke/config; security E2E in existing isolated harness.
- Docs: PROJECT_MEMORY, ARCHITECTURE, PRODUCTION_OPERATIONS, this report.

## Tests / Validation

| Command/check | Actual result |
| --- | --- |
| `npm test` | Exit 0: **40 files / 359 tests passed** (baseline 33/259; +100 tests net) |
| `npm run typecheck` | Exit 0: Next route typegen + tsc --noEmit |
| `npm run lint` | Exit 0, no warnings/errors |
| `npm run build` | Exit 0: Next 16.3.0, 89 generated pages, dynamic category/subcategory/API routes retained |
| `git diff --check` | Exit 0 |
| Existing isolated storefront/taxonomy E2E | **29 passed, 1 intentional mobile skip**, Chromium desktop/mobile, including axe |
| Added security E2E (`--grep @security`) | **6 passed**, repeated on final proxy/header changes |
| Firestore emulator smoke | **26 checks passed**, including two explicit known-P0 exposure probes |
| `npm audit` | Exit 1: 13 nodes, 2 high / 11 moderate / 0 critical |
| `npm audit --omit=dev` | Exit 1: 6 moderate / 0 high / 0 critical; reachability analysis SEC-11 |
| Final working-tree secret scan | **1 390 files**, 0 signatures/actual private env value matches; only `.env.example` included |
| Browser bundle secret scan | `.next/static`, 87 files, 0 actual private env value matches |
| Read-only live catalog/private boundary | 238 published Products / 27 active Categories; sensitive collection reads 403 |
| Read-only production health | HTTP 200; minimal status/service/version/timestamp |
| Live admin grants / Storage IAM | **NOT VERIFIED**: local ADC requires reauthentication; no retry login/change of identity |

Последний полный quality gate запускался после code fixes. Последующие правки — только запись результатов в этот report; git diff --check повторён. Main `.next` build и isolated E2E строятся отдельно; E2E не использует production secrets/credentials. Existing 29+1 suite и security 6 suite запускались отдельно; это не утверждение о новом объединённом 36-test run.

Emulator writes выполнялись **только** в `demo-sanpack-audit` на `127.0.0.1:8085`, runner отвергает другой host. 26 checks, в том числе известные draft/hidden 200 evidence probes; не выдавать их за production safety certification. Первый запуск test config был отклонён Firebase CLI из-за пути rules вне project root; config перенесён в корень и успешный запуск выполнен повторно.

Новый checkout regression сначала **упал** на request-price=123; после fix helper тест проходит. Исходный зелёный suite этого поведения не покрывал.

Dependency audit exit 1 ожидаем из-за перечисленных advisories, не «0 vulnerabilities». Lock/dependency upgrades не делались. E2E fixture заменяет auth/cloud layers; не доказывает valid production login/upload/submit. Read-only production health 200; это не readiness proof privileged services.

## Data / migrations / Production

- **Production Firestore writes: NO.**
- **Migrations/backfills/grant provisioning/taxonomy mapping: NO.**
- **Production Storage upload/delete: NO.**
- **Telegram/Gemini mutation/generation: NO.**
- **Commit/push/deploy/rules deployment: NO.**
- Catalog migrations для local fixes не нужны; owner grants и permissions требуют отдельной operator verification/bootstrap, если отсутствуют. Public draft boundary strategy/apply ещё не выбраны.

## Not changed

Catalog/commerce/taxonomy foundation не перестраивался. Не менялись depth, filtering/facets/URL state, search attributes, brands, collections/tags, ZH, storefront visual UX, checkout/payment/inventory subsystems. P2 не исправлялся. Production taxonomy, цены и изображения не менялись. Разрешение для будущего cloud apply не подразумевается результатами тестов.

## Git state / Recommended next step

Branch main; HEAD остаётся `e07b507029a6be1b750ebea3a55cb77fb56124ff`. Рабочее дерево dirty: только local audit fixes/tests/docs; ничего не staged/committed/pushed/deployed этим аудитом.

До следующего функционального/SEO этапа закрыть только launch blockers: выбрать и проверить public Firestore read boundary (SEC-02), установить trusted ingress/rate/body/cost controls (SEC-05), проверить и согласовать Storage rules/IAM/private attachment policy (SEC-10), подтвердить owner grants/ADC/Secret Manager и отдельный порядок применения rules/API. Сначала review этих локальных изменений и read-only configuration check после восстановления operator access. Не начинать новый architecture refactor или Admin UX/SEO этап, пока статус NOT READY.

## Primary references

- [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies): CSRF protection и recent auth_time при обмене ID token.
- [Firestore rules/query behavior](https://firebase.google.com/docs/firestore/security/rules-query): rules не фильтры; Admin SDK/IAM — отдельная trust boundary.
- [Google Cloud X-Forwarded-For handling](https://docs.cloud.google.com/load-balancing/docs/https#x-forwarded-for_header): supplied prefix не валидируется автоматически.
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq): affected API vs фактический v4() use проверен в installed consumers.

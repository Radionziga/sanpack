# SANPACK — Project memory

> **For AI agents / future development sessions**
>
> Перед существенными изменениями прочитай:
> 1. этот `docs/PROJECT_MEMORY.md`;
> 2. [docs/ARCHITECTURE.md](ARCHITECTURE.md);
> 3. соответствующий domain-specific документ, например [CATALOG_COMMERCE_ARCHITECTURE.md](CATALOG_COMMERCE_ARCHITECTURE.md).
>
> Затем проверь фактический код и `git status`. Документация передаёт контекст и принятые решения, но source of truth — текущая реализация. Не считай исторический audit списком всё ещё открытых проблем.

Снимок завершённого catalog/commerce + optional Subcategory этапа: **2026-08-31**, ветка `main`, исходный HEAD до этапа `2dcd7b77e4ba24b2cd14e35fd38a666ca6ad81df`. Независимый review принят пользователем; подготовлен единый checkpoint `feat: harden catalog commerce and taxonomy foundation` (фактический hash смотрите в Git history). Это описание source, не подтверждение состояния production.

## Project identity

SANPACK — действующий мультиязычный storefront/B2B-каталог упаковки и продуктов питания для Ташкента. Есть каталог, CMS, корзина-заявка, обработка заказов, Telegram, печатный каталог и конструктор пакета с AI-визуализацией. Firestore — рабочий источник данных; Firebase Storage — production media.

Та же кодовая база должна служить reusable / white-label foundation: например, для продуктов, упаковки, смартфонов или шин. Смартфоны и шины — архитектурные test fixtures, **не созданные реальные магазины**. Наличие `salesMode: ecommerce` в типах не означает реализованный платёжный шлюз.

## Product philosophy

- Расширять существующие механизмы минимально, не строить новый Shopify.
- Новый ассортимент и характеристики задаются CMS/data, а не React-ветками под конкретный товар.
- Администратор выбирает понятные названия характеристик, а не программирует internal keys.
- Backward compatibility, сохранность ID/slug/URL/изображений/заказов важнее красивого переписывания.
- Универсальная механика и SANPACK-контент — разные вещи. Не превращать каждую маркетинговую фразу в настройку.

## Current stack

Точные resolved versions из `package-lock.json`: Next.js **16.3.0** / App Router, React **19.2.8**, TypeScript **5.9.3** strict, Firebase client **12.17.0**, Admin SDK **14.2.0**, next-intl **4.13.4**, Tailwind **4.1.11**, Zod **4.4.3**, React Hook Form **7.83.0**. Tests: Vitest **4.1.11**, Playwright **1.62.1**, axe **4.13.0**. Media: Sharp **0.35.3**; backoffice PDF: pdfmake **0.3.11**.

Package manager — **npm**, lockfile v3. CI — Node 24; README указывает Node ≥20.9, `package.json` не закрепляет `engines`. Next standalone output; production hosting — Firebase App Hosting. Запуск/credentials: [README](../README.md), безопасный шаблон [.env.example](../.env.example). Секретные значения не переносить в документацию.

## Repository map

| Путь | Роль |
| --- | --- |
| `app/[locale]`, `app/admin`, `app/api` | Storefront routes, **не локализованный** `/admin`, серверный API/BFF |
| `components` | Storefront/catalog/layout, admin editors, checkout, bag designer |
| `lib/catalog`, `lib/commerce` | Характеристики, facets/search/presentation; цены и правила количества |
| `lib/repositories`, `lib/firebase` | Публичные чтения, browser API wrappers, серверный Firebase доступ |
| `lib/orders`, `lib/settings`, `lib/validation` | Каноническая заявка, settings merge, Zod/проверки связей |
| `lib/auth`, `lib/telegram`, `lib/gemini`, `lib/media`, `lib/documents` | Identity, интеграции, Storage/media, печатные документы |
| `types/index.ts`, `context` | Domain types; cart/favorites/language/settings/auth/UI state |
| `i18n`, `messages`, `lib/i18n` | Routing, четыре словаря, localized field/copy helpers |
| `public`, `scripts`, `tests`, `docs` | Assets/seed media, audit/import/migration tools, проверки, знания проекта |

## Core domain model

- **Group → Category → optional Subcategory → Product**. Все три уровня — существующие документы `Category.parentId`: depth 0/1/2, максимум три taxonomy levels. Product.categoryId указывает на Category **или** Subcategory; Category с детьми может одновременно иметь собственные товары. Subcategory не обязательна; arbitrary nesting запрещён. Persistent type/depth/path и отдельной subcategories collection нет.
- `ProductVariant` вложен в Product: SKU, attributes, цена, остаток, изображение и overrides правил заказа. Второй options engine отсутствует и не нужен.
- `Attribute` — единая definition: localized titles, `key`, `type`, `unit`, options, category applicability, required/filterable/cardVisible/productVisible, порядок. Значения: `string | number | boolean | string[]`.
- `SiteSettings` — центральная публичная identity/configuration; приватные Telegram/Gemini настройки хранятся отдельно.
- `QuantityUnit`, `unitCode`/`salesUnit` — единица продажи; `orderPackaging` — внешняя упаковка; `unitPricing` — содержимое одной продаваемой единицы для сравнения цен. Это разные понятия.
- `RequestOrder` — серверный snapshot заявки с позициями, первоначальными позициями, итогами, revision/audit trail; не платёж/резерв склада.

## Important architectural decisions

1. Поддерживаются ровно Group → Category → optional Subcategory. Общий `categoryHierarchy.ts` определяет lineage, depth, scope, visibility, labels, canonical paths и placement validation. Group/Category scope включает собственный узел и потомков; Subcategory — только себя. API проверяет всё перемещаемое поддерево, не только новый parent.
2. `Attribute.categoryIds` определяет применимость; наследование Group → Category → Subcategory используется тем же attribute engine для Product и Variant. Legacy `Category.attributeIds` не превращать во вторую truth.
3. Фильтрация проверяет **одну целостную конфигурацию**: общие attributes + overrides одного варианта, включая его наличие.
4. Variant attributes не копируются в product attributes ради facets.
5. `getEffectiveCatalogPrice` согласует preview и sorting; order price вычисляется отдельно.
6. `orderPackaging` управляет внешней упаковкой; `units_per_pack`/`packs_per_sack` сами по себе информационные attributes, не альтернативные quantity rules.
7. Расширения Product optional: существующие документы не требуют backfill для старого поведения.
8. `SiteSettings` сохраняется; новый `StoreConfig`, второй catalog/attributes/variants engine не создавать.

## Pricing mental model

Основной модуль — `lib/commerce/productOffer.ts`; текст preview — `lib/catalog/productPresentation.ts`.

- **Sale price**: `variant.price ?? product.price` за одну sales unit.
- **Wholesale**: подходящая ступень по quantity заменяет sale unit price; variant tiers при наличии имеют приоритет над product tiers.
- **Effective catalog price**: минимум положительных доступных для показа цен; `catalogPriceBasis: comparison` выбирает минимум корректно нормализованных цен, иначе fallback на sale preview.
- **«От X»**: несколько priced offers либо соответствующий `priceMode: from`, не обязательно каждый товар с единственным вариантом.
- **Comparison price**: производная `price / contents`, не новая коммерческая цена. Физические преобразования g↔kg, ml↔l; также piece, meter, square_meter. Конфигурации вариантов приводятся к одной совместимой единице.
- **Cart/order price**: sale/wholesale × заказанное количество; comparison сюда не подставляется. JSON-LD Offer тоже использует sale, не рекламную цену за кг.

Пример: упаковка 2 кг за 66 000 сум может показывать 33 000/кг; покупается упаковка за 66 000. `unitPricing.quantity = 2` не разрешает покупку по 1 кг. Legacy `price_per_kg` не является канонической формулой цены.

## Attribute / variant mental model

Общие product values наследуются каждым вариантом, variant values переопределяют ключи. Все активные keys должны совпасть на **одном** варианте; несколько выбранных options одного key объединяются через OR. Нельзя объединять storage из варианта A и color из B.

`inStockOnly` находится внутри той же проверки конфигурации: status должен быть `in_stock`, quantity — отсутствовать либо быть >0. Variant status может наследовать product status; variant stockQuantity **не подменяется агрегированным product stockQuantity**. Для товара без вариантов используются product stock поля. Наличие другого, не совпавшего варианта не спасает товар.

Required value допустим на Product либо у каждого варианта. CMS controls используют definitions; неизвестные legacy attribute keys сохраняются. Typed filters: options, числовой диапазон, boolean «да», color swatch для распознаваемого CSS-цвета. `range` здесь числовое значение, не объект интервала.

## Admin mental model

CMS управляет группами/категориями/подкатегориями, двумя изображениями категории, порядком/видимостью, definitions характеристик, товарами/вариантами, pricing/quantity/packaging, media/documents/SEO, company identity и сервисными modules. Дерево ограничено тремя уровнями, parent selector запрещает недопустимые перемещения, product selector показывает полный путь. Category-aware editor показывает применимые characteristics; variant editor предлагает определения из CMS.

Category сохраняется транзакцией: чтение дерева → проверка self/cycle/depth/parent/unique slug → запись. Превратить узел с непосредственно назначенными товарами в Group нельзя. Старые Product.categoryId не переписываются. `categoryId` имеет приоритет над устаревшим `categorySlug` при вычислении scope.

URLs: Group/Category сохраняют `/[locale]/catalog/slug`, Subcategory получает `/[locale]/catalog/category/subcategory`. Старый flat URL подкатегории перенаправляется 308 на canonical; неверная пара parent/slug — 404. Breadcrumbs опускают Group над Category. Sitemap/metadata/search/navigation используют общие paths. Скрытый предок скрывает ветку навигации/страниц; это не изменение политики публичного доступа к product documents.

Главная по умолчанию показывает Categories, не все Subcategories. Подкатегория может войти в showcase только с явным `featured: true`. Внутри Category — компактные chips; на mobile горизонтальный scroll; изображение опционально.

Путь сохранения: **form → AdminRepository (HTTP wrapper) → `/api/admin/data` → auth + validation → Admin SDK/Firestore → cache invalidation**. Не считать AdminRepository отдельным server persistence layer.

Admin/SEO foundation audit **2026-09-05** добавил только operational P1 без изменения domain model: список товаров ищет name/SKU/brand/variant SKU, фильтрует taxonomy/status/availability, сортирует включая effective catalog price и показывает 50 строк на страницу; Category tree показывает scope counts. Product Editor предупреждает о несохранённых изменениях, slug-impact и даёт компактную навигацию по секциям. Новый Attribute key генерируется из RU title, допускает override только до первого save и затем неизменяем также на API boundary. SEO editor Product/Category показывает локализованный fallback, длину, canonical и приблизительный SERP preview.

Release-candidate stabilization **2026-09-07** закрыла adversarial findings F01–F17 поверх этого слоя без изменения catalog/commerce model. Storefront routes выполняются dynamic SSR; Product server route отдаёт crawler-visible H1, основной контент, sale-price preview, breadcrumbs и JSON-LD, а в client boundary передаётся только текущий Product, definitions и до четырёх related Products. Каталог синхронизирует sort/view/stock/own/typed filters с query string; locale switch сохраняет query/hash. Order mutations защищены optimistic revision и idempotency, checkout повторно сверяет cart с актуальным каталогом, customer order API использует явную projection, Admin UI применяет capability matrix и полноценный dialog/dirty-state lifecycle. Подробный фактический handoff: [STABILIZATION_HANDOFF_2026-09-07.md](STABILIZATION_HANDOFF_2026-09-07.md).

Повторная независимая verification **2026-09-08** закрыла обнаруженные на реальных межслойных и browser-сценариях пробелы: Product mutation восстанавливает trusted ID на сервере и сохраняет server-owned creation audit; lifecycle editor focus больше не зависит от draft; PDF audit дописывается атомарно после генерации; checkout idempotency распознаёт точный сохранённый intent до повторной проверки изменяемого каталога и возвращает одинаковый безопасный customer receipt. Capability-based direct-page access, cart reconciliation и mobile fixed-action policy также доведены до согласованного поведения. Stabilization E2E теперь входит в обычный CI/release gate. Фактический handoff: [STABILIZATION_VERIFICATION_HANDOFF_2026-09-08.md](STABILIZATION_VERIFICATION_HANDOFF_2026-09-08.md).

Принятый checkpoint `46cb7bfec55b1ccb033a8380fdb3ba81b1eccf14` развернут в production **2026-09-08** как App Hosting build `build-2026-09-08-001` / rollout `rollout-2026-09-08-001`; build `READY`, rollout `SUCCEEDED`, traffic 100%. Production hard-route, SSR/SEO, authenticated owner-admin, mobile navigation/cart и security-boundary smoke прошли без business-data mutations. Customer-history composite index `requests(customerUid ASC, createdAt DESC, __name__ DESC)` имеет state `READY`. Подробности и ограничения проверки: [PRODUCTION_RELEASE_ROLLOUT_2026-09-08.md](PRODUCTION_RELEASE_ROLLOUT_2026-09-08.md).

SEO metadata теперь централизует canonical/hreflang/OG/Twitter fallback для Home, Catalog, Product, Group/Category/Subcategory и основных content routes. Product и taxonomy pages отдают BreadcrumbList, locale layout — Organization/WebSite; sitemap продолжает включать только public canonical entities, utility routes получают noindex headers и robots disallow. Новые SEO поля не добавлялись: existing optional `seo` и `SiteSettings.seo` остаются source of truth, publication/status — indexability contract.

После Production Security Audit Firebase user с email **не получает роль автоматически**: требуется `admins/{uid}` с `active: true` и известной `role`, проверяемый сервером на каждом запросе. При отсутствии grant/ошибке доступа login закрыт. Перед production rollout существующий owner grant был проверен: одна активная запись `super_admin`, UID/email согласованы с enabled Firebase Auth user; новый grant не создавался. Покупатели используют отдельную Telegram identity.

## White-label boundaries

Historical Production Security Audit: [PRODUCTION_READINESS_SECURITY_AUDIT_2026-08-31.md](PRODUCTION_READINESS_SECURITY_AUDIT_2026-08-31.md). Его launch blockers были закрыты в local code/config plan: [LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md](LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md), после чего controlled foundation rollout завершён 2026-09-04. Исторические статусы `NOT READY`/`READY FOR CONTROLLED ROLLOUT` описывают соответствующие прежние точки времени; текущий production status — **PRODUCTION RELEASE LIVE** согласно [PRODUCTION_OPERATIONS.md](PRODUCTION_OPERATIONS.md).

Controlled rollout preflight **2026-09-04** сначала был остановлен из-за общего Storage ruleset со старым `vetclinics`; это решение сохранено историческим commit. Затем владелец подтвердил, что экспериментальный backend прекращён, а default bucket `stamply-4df8a.firebasestorage.app` является SANPACK production Storage boundary. Повторный read-only inventory нашёл 252 объекта только в `media/**`, без legacy/private paths и public IAM/ACL. SANPACK-only Storage rules, trusted-server application revision и deny-all direct-client Firestore rules применены и проверены. Foundation revision `sanpack-build-2026-09-04-002` теперь является подтверждённым rollback target; live revision — `sanpack-build-2026-09-08-001`. Production TTL для `rateLimits.expiresAt` активен. Production taxonomy/content не изменялись.

Через `SiteSettings` меняются name, logos/dark logo/favicon, descriptions, contacts, theme tokens/font preset, default SEO и сервисная навигация. Generic floating contact использует company name. `ownProduction` остаётся флагом, фильтр скрыт, если в текущем scope нет таких товаров; это не новая tags subsystem.

Остаются SANPACK marketing content, seed/catalog image maps, internal `sanpack_*` identifiers. Routing локалей фиксирован RU/UZ/EN/ZH в коде: settings.locale не регистрирует произвольный новый язык. Полный white-label запуск всё ещё требует ревью контента, integrations и currency/checkout assumptions.

## Existing important documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — системная карта, точные границы и актуальные уточнения.
- [CATALOG_COMMERCE_ARCHITECTURE.md](CATALOG_COMMERCE_ARCHITECTURE.md) — компактное domain rationale; сохранён, не заменён. Уточнения stock/boolean/brand/from — в новой архитектуре.
- [README](../README.md) — setup, Firebase, команды; описание checkout name/phone неполно: текущий API требует также delivery address/date/window.
- [PRODUCTION_OPERATIONS.md](PRODUCTION_OPERATIONS.md) и [bag-designer cost control](operations/bag-designer-cost-control.md) — release checks, эксплуатация, лимиты/TTL/drafts. Инструкции не доказывают, что alerts/TTL уже настроены в облаке.
- [CATALOG_ADMIN_AUDIT_2026-08-29.md](CATALOG_ADMIN_AUDIT_2026-08-29.md), [CODEBASE_AUDIT_2026-08-29.md](CODEBASE_AUDIT_2026-08-29.md) — исторические аудиты, не текущий backlog целиком.
- [STOREFRONT_DESIGN_SYSTEM.md](STOREFRONT_DESIGN_SYSTEM.md), [UX blueprint](product-design/SANPACK_STOREFRONT_UX_BLUEPRINT.md) — design context; сверять с UI. Текущие bento: цветная иллюстрация и белый текст **без белых плашек/градиента/тени текста**. Маленькие navigation images — отдельные светлые иллюстрации, не обложки bento.

## Validation baseline

Quality gate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`; для UI — соответствующий browser smoke / `npm run test:e2e`. Обычный Playwright suite и taxonomy suite используют production build/start fixture, а не Next dev/HMR; cloud/admin writes отключены.

`npm run typecheck` сначала выполняет `next typegen`, затем `tsc --noEmit`. `next-env.d.ts` генерируется Next.js, исключён из Git и остаётся в `tsconfig.json`; dev/build imports не нужно вручную править или коммитить. `.env.example` содержит placeholders собственного Firebase project; SANPACK-specific operational/deployment scripts требуют отдельной настройки при копировании магазина.

Исторический baseline до Subcategory: 30 files / 215 tests, build 89 страниц. Актуальные результаты Subcategory-этапа: [HANDOFF](SUBCATEGORY_HANDOFF_2026-08-31.md). Изолированный runtime smoke: `npx playwright test --config=playwright.taxonomy.config.ts`; временная копия source, synthetic taxonomy, запрет cloud/admin writes. В нём admin authentication/read — fixtures; реальные обработчики сохранения отдельно тестируются с mock Firestore. Успешный seed build не подтверждает доступность live Firestore/Storage.

## Known limitations

- Facet counts не contextual; attribute filters показываются в category/group scope, не в общем `/catalog`. Активное состояние sort/view/stock/own/typed filters синхронизировано с URL query и восстанавливается при Back/Forward.
- Search не индексирует attributes/variant SKU; после фильтра не выбирает автоматически совпавший вариант на detail page.
- Boolean filter сейчас true-only; brand facet использует `brandName` лишь при отсутствии `attributes.brand` — legacy расхождения ещё возможны.
- Checkout — request workflow: нет payment gateway, inventory reservation/decrement. `inStockOnly` не обещает наличие при последующем оформлении.
- JSON-LD — один sale Offer с product stockStatus, не полный variant inventory feed; нет currency conversion.
- Product route server-rendered: raw initial HTML содержит Product H1, основное описание/изображение, sale-price preview, breadcrumbs и structured data. Интерактивный выбор варианта/quantity/cart остаётся client-side; сервер передаёт bounded payload, а не весь каталог.
- Missing ZH content ещё маскируется fallback/legacy seed localization adapters; SEO и некоторые страницы остаются SANPACK-oriented.
- Нет Brand pages, collections/tags engine; это отложенный scope, не основание переписывать Product.
- Firestore public boundary работает в production как Admin-SDK server read → explicit allowlist projection → SSR/`/api/catalog`; deployed rules deny all direct client reads/writes. Products published-only, Category lineage/Banners active-only, unknown fields stripped. Schema migration не потребовалась.
- Public read получает коллекции целиком; client filtering/search — не индекс для огромного каталога. Runtime IAM/secrets и TTL проверены при rollout; alerts и cost dashboards остаются эксплуатационной задачей, а не свойством codebase.
- Slugs категорий остаются глобально уникальными. Flat legacy URL перенаправляется по текущему lineage; старый nested URL после будущего изменения parent/slug не хранится в истории (нужен согласованный redirect plan). Существующие статические marketing links не переписываются автоматически.
- F12 закрыт в `0776239`: route boundary обновляется в AdminShell по текущему pathname; denied → allowed и browser history покрыты desktop/mobile regression, server capability checks сохранены.

## DO NOT DO

**Не выполнять без отдельного обоснованного задания:**

- Rewrite catalog engine, второй attributes/variants engine, новый StoreConfig, arbitrary nested taxonomy.
- Destructive Firestore reset/migration, удаление legacy данных или изменение production во время обычного refactor.
- Подмена реальных цен comparison values; перенос variant значений в Product ради фильтра.
- Подмена navigation thumbnails широкими брендированными category covers. Иллюстрация категории должна представлять класс товаров, а не один бренд/SKU.
- Автоматический fallback на seed при ошибке Firebase. `SANPACK_USE_SEED_DATA=true` — явный demo режим, **не sandbox для mutation APIs**.
- Commit/push/deploy без явного актуального задания; secrets/env values в git/docs.
- Реализация P2 collections/Brand CMS/ERP ради теоретической универсальности.

## Current next-step context

Поверх ранее завершённых catalog/commerce и stock-aware исправлений добавлена optional Subcategory, без изменения pricing/variants/checkout. Production taxonomy не перестраивалась; read-only рекомендации и фактические проверки — в [HANDOFF](SUBCATEGORY_HANDOFF_2026-08-31.md). При реализации Subcategory Firestore writes/migrations/commit/push/deploy не выполнялись; checkpoint разрешён отдельно ниже.

После независимого review пользователь отдельно разрешил финальную уборку и один checkpoint commit. Неиспользуемые `1.png` и `public/catalog/categories/raw_1.png`–`raw_22.png` исключены из source: raw PNG побайтно дублировали сохранённые изображения с смысловыми названиями. Runtime assets и WebP не удалялись. Исторический Subcategory handoff описывает состояние **до** checkpoint.

Production readiness/security audit, launch-blocker remediation, Admin/SEO foundation и stabilization verification завершены. Финальный stabilization checkpoint `077623902f5a5da6ead798d16cdb4d14b9c5d34e` работает в production на `build-2026-09-08-002` со 100% traffic; `build-2026-09-08-001` сохранён как rollback target. F12 закрыт. Deferred limitations не исправлять автоматически. Production taxonomy mapping и physical cleanup неиспользуемого `vetclinics` остаются отдельными явно разрешаемыми операциями.

## Final stabilization patch — 2026-09-08

F12 denied-route recovery is corrected in the existing AdminShell using the current pathname. API authorization, commerce, data schemas and infrastructure remain unchanged. The patch is live as `build-2026-09-08-002` (100% traffic, rollout SUCCEEDED); rollback is build 001. Post-rollout docs remain local to avoid a documentation-only rollout. See [STABILIZATION_RELEASE_2026-09-08.md](STABILIZATION_RELEASE_2026-09-08.md) for the release record and next Customer Identity/Telegram scope.

## Customer identity / Telegram release candidate — 2026-09-09

Local candidate after `0776239` closes the customer identity split between Telegram OIDC (`sub`) and Mini App (`id`) without rewriting auth: verified Telegram user ID is the cross-flow key, existing UIDs remain aliases, and customer history queries only signed aliases. Re-login preserves edited profile contact fields. New customer sessions have per-session Firestore records and logout revokes only the current session; legacy cookies remain valid until their existing expiry.

Order creation orchestration is shared by live checkout and a new `orders.write` operational smoke. The smoke is isolated in `testRequests`/`testRequestIdempotency`, uses canonical Product pricing/quantity/idempotency, and always selects a network-free notification sink. Public request schema rejects suppress/test controls. Live notification state is now explicit and visible in Admin, while a delivery failure does not duplicate or undo the request.

No production writes, notifications, deploy, push, customer merge or migration were performed. Production read-only customer inventory could not run because operator Firebase/ADC credentials require reauthentication; run `npm run identity:audit -- --project stamply-4df8a` before controlled deployment. Detailed evidence and remaining limitations: [CUSTOMER_IDENTITY_TELEGRAM_HANDOFF_2026-09-09.md](CUSTOMER_IDENTITY_TELEGRAM_HANDOFF_2026-09-09.md).

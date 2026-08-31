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

Firebase Authentication зарезервирован для вручную созданных администраторов: валидный Firebase user с email получает `super_admin`. Покупатели используют отдельную Telegram identity. Не включать публичную Firebase-регистрацию без пересмотра этой модели.

## White-label boundaries

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

Quality gate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`; для UI — соответствующий browser smoke / `npm run test:e2e`.

`npm run typecheck` сначала выполняет `next typegen`, затем `tsc --noEmit`. `next-env.d.ts` генерируется Next.js, исключён из Git и остаётся в `tsconfig.json`; dev/build imports не нужно вручную править или коммитить. `.env.example` содержит placeholders собственного Firebase project; SANPACK-specific operational/deployment scripts требуют отдельной настройки при копировании магазина.

Исторический baseline до Subcategory: 30 files / 215 tests, build 89 страниц. Актуальные результаты Subcategory-этапа: [HANDOFF](SUBCATEGORY_HANDOFF_2026-08-31.md). Изолированный runtime smoke: `npx playwright test --config=playwright.taxonomy.config.ts`; временная копия source, synthetic taxonomy, запрет cloud/admin writes. В нём admin authentication/read — fixtures; реальные обработчики сохранения отдельно тестируются с mock Firestore. Успешный seed build не подтверждает доступность live Firestore/Storage.

## Known limitations

- Facet counts не contextual; attribute filters не синхронизированы с URL и показываются в category/group scope, не в общем `/catalog`.
- Search не индексирует attributes/variant SKU; после фильтра не выбирает автоматически совпавший вариант на detail page.
- Boolean filter сейчас true-only; brand facet использует `brandName` лишь при отсутствии `attributes.brand` — legacy расхождения ещё возможны.
- Checkout — request workflow: нет payment gateway, inventory reservation/decrement. `inStockOnly` не обещает наличие при последующем оформлении.
- JSON-LD — один sale Offer с product stockStatus, не полный variant inventory feed; нет currency conversion.
- Missing ZH content ещё маскируется fallback/legacy seed localization adapters; SEO и некоторые страницы остаются SANPACK-oriented.
- Нет Brand pages, collections/tags engine; это отложенный scope, не основание переписывать Product.
- Firestore rules публично читают каталог без status-фильтра; app-level published projection не закрывает прямое чтение drafts. Подробнее — security section архитектуры.
- Public read получает коллекции целиком; client filtering/search — не индекс для огромного каталога. Admin SDK credentials/TTL/alerts — эксплуатационные prerequisites.
- Slugs категорий остаются глобально уникальными. Flat legacy URL перенаправляется по текущему lineage; старый nested URL после будущего изменения parent/slug не хранится в истории (нужен согласованный redirect plan). Существующие статические marketing links не переписываются автоматически.

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

Следующий этап — отдельный **production-readiness/security audit перед первым deploy обновлённой архитектуры**, только по новой команде пользователя. Push/deploy, Firestore writes и SANPACK taxonomy mapping не разрешены этим checkpoint. Deferred limitations не исправлять автоматически.

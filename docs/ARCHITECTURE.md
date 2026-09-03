# SANPACK — Architecture

Состояние завершённого catalog/commerce + optional Subcategory этапа на **2026-08-31**; branch `main`, исходный HEAD до этапа `2dcd7b77e4ba24b2cd14e35fd38a666ca6ad81df`. После независимого review подготовлен единый checkpoint; его hash определяется Git history. Не является подтверждением deployment; исторический read-only snapshot ассортимента отдельно приведён в Subcategory handoff.

Быстрый вход: [PROJECT_MEMORY.md](PROJECT_MEMORY.md). Принципы конкретного домена: [CATALOG_COMMERCE_ARCHITECTURE.md](CATALOG_COMMERCE_ARCHITECTURE.md). Этот документ описывает интеграцию всей системы и уточняет пограничные случаи, а не заменяет domain note.

## 1. System overview

Один Next.js App Router project: локализованный storefront, отдельный backoffice, Route Handler API, общие TypeScript domain helpers. Firestore хранит ассортимент/configuration/заявки; Storage — media; Firebase Auth — admin identity, Telegram — customer identity и уведомления. Gemini используется в явных AI workflow, не при каждом чтении каталога.

| Слой | Ответственность и граница |
| --- | --- |
| `app/[locale]` | Public routes, server metadata/data loading и client page boundaries |
| `app/admin/(dashboard)` | Защищённый backoffice по `/admin`, без locale prefix |
| `app/api` | Auth, validation, privileged writes, integration calls; клиент не пишет заказные цены напрямую |
| `components` | UI; catalog presentation, variant/attribute editors, layouts, печать |
| `lib/catalog` | Applicability, typed facets, search, public projection, localized/image compatibility |
| `lib/commerce` | Pure pricing/quantity helpers, общие для client и server |
| `lib/orders` | Повторное чтение каталога, проверка позиции, canonical order snapshots/totals |
| `lib/repositories` | Server public REST reader и browser HTTP wrappers; не единая ORM для всех writes |
| `lib/firebase`, `lib/settings`, `lib/validation` | Admin SDK, settings merge, Zod и связи сущностей |
| `context` | Cart/favorites/localization/settings и UI state; не доверенный источник серверной цены |

Версии из lockfile: Next 16.3.0, React 19.2.8, TypeScript 5.9.3, Firebase 12.17.0 / Admin 14.2.0, next-intl 4.13.4, Tailwind 4.1.11, RHF 7.83.0, Zod 4.4.3. Vitest 4.1.11, Playwright 1.62.1, axe 4.13.0. Sharp 0.35.3 и pdfmake 0.3.11. npm / `package-lock.json`; CI Node 24, Next standalone output, Firebase App Hosting.

## 2. High-level data flow

```text
Explicit seed flag ──→ seed data ────────────────────────────┐
Firestore Admin SDK ──→ serverCatalogRepository + explicit public projection ──┤
                                                           ├─→ server routes / metadata
                                                           └─→ /api/catalog
                                                                ↓
                                                          PublicRepository
                                                                ↓
                                        catalog/commerce helpers → client UI

Admin form → AdminRepository (browser HTTP wrapper) → /api/admin/data
         → admin session + Zod + relationship checks → Admin SDK → Firestore
                                                     └─→ revalidateTag

Cart snapshot → IDs + quantity + delivery → /api/requests
             → current Firestore products → orderService → requests document
                                                        └─→ Telegram notification
```

ServerCatalogRepository — `server-only`, читает Firestore через runtime Admin SDK и перед кешированием применяет explicit allowlist projection каждого публичного ресурса. Browser получает только `/api/catalog`/SSR output; Firestore rules запрещают все direct client reads/writes. Storefront не требует admin/customer identity, но production runtime обязан иметь Firestore IAM. Успешный build с seed/unavailable shells не доказывает runtime IAM.

## 3. Catalog and merchandising

`types/index.ts` определяет `Category`, `Product`, `ProductVariant`, `Attribute` и commerce/settings типы.

- Поддерживается **Group → Category → optional Subcategory → Product**: одна сущность Category, вычисляемая глубина 0/1/2 через parentId. Group без parent; Category под Group; Subcategory под Category. Максимум три taxonomy levels, не arbitrary nesting. Product.categoryId допускает Category или Subcategory; наличие детей не запрещает direct products. `categorySlug` нормализуется при admin save, но при чтении приоритет имеет ID.
- `lib/catalog/categoryHierarchy.ts` — общий lineage/scope/depth/path/label/visibility helper. Group scope включает все Category/Subcategory products; Category — direct products + direct Subcategory products; Subcategory — только свои. Некорректный lineage fail-closed. CMS/API запрещают missing parent/self/cycle/depth>2 и перемещения, углубляющие потомков сверх лимита. Новых persistent type/depth/path полей нет.
- Category содержит localized title/description/SEO, `status`, `sortOrder`, `featured`, `featuredSortOrder`. Product: publication/visibility, SKU/slug, brand, category, localized text, gallery/documents/SEO, attributes/variants, commerce, related IDs, merchandising flags и timestamps.
- Groups/categories добавляются через CMS. `featured`, `newProduct`, `ownProduction` сохранены; generic Collections engine отсутствует.

### Category artwork and showcase

Navigation и bento имеют **раздельные** CMS fields + Storage paths:

| Место | Реальный приоритет |
| --- | --- |
| `categoryArtwork.ts` | `navigationImage` → известный legacy category-ID map → `image` |
| `popularCategoryArtwork.ts` | `cardImage` → `banner` → legacy artwork map → `image` |

`getStorefrontCategoryGroups` выбирает active groups и ветки с активными предками. Default showcase — direct Categories: явно featured и известные legacy IDs, если не featured:false. Subcategory участвует только при явном featured:true, не автоматически из legacy/artwork fallback. Порядок featuredSortOrder ?? sortOrder; существующий group limit (default 12) сохранён. Если curated набор пуст, fallback — только direct Categories с cardImage/banner. Главная не размножает подкатегории в shelves автоматически; counts/shelves включают descendant products через общий scope.

Desktop sidebar раскрывает явно ограниченные три уровня. В Category/Subcategory pages компактные chips показывают детей Category и «Все»; mobile — горизонтальный scroll. Navigation image опциональна; bento для Subcategory не требуется. Скрытый ancestor исключает всю ветку из nav/route/sitemap, но не заменяет продуктовую публикацию или Firestore security rules.

Local assets всё ещё часть compatibility: `public/catalog/category-icons-v3`, `popular-categories`, promo/product images и legacy ID maps. Это не полностью content-free white-label installation. Thumbnail — светлая маленькая предметная иллюстрация; bento — широкий цветной фон и белый текст без дополнительной плашки/градиента/тени текста. Category art не должно зависеть от одного branded SKU.

## 4. Attribute architecture

`Attribute` definition: `key`, RU/UZ/EN/ZH titles, `type`, `unit`, `options`, `categoryIds`, `required`, `filterable`, `cardVisible`, `productVisible`, `sortOrder`.

`attributeApplicability.ts` использует общий bounded lineage. Пустой categoryIds — universal; Group attr наследуется Category/Subcategory; Category attr — своими Subcategories; attr конкретной Subcategory не применяется sibling. Эти же definitions используются для required/filterable/cardVisible/productVisible, Product Editor и ProductVariantsEditor. Category.attributeIds остаётся legacy, не второй truth.

Product/Variant values — `Record<string, string | number | boolean | string[]>`. Общие product values + overrides одного варианта образуют configuration. Отдельных smartphone/tire полей в Product нет.

`ProductAttributeField` подбирает CMS control по типу. `attributeValues.ts` отвечает за безопасный display/parse legacy values; число/boolean нельзя обрабатывать как безусловную строку. `getPresentedProductAttributes` использует definitions для названия/единицы/видимости; legacy compatibility не удалена.

`productAttributeRequirements.ts`: required key заполнен на Product **или** в каждом варианте; `0` и `false` — значения, не отсутствие. `/api/admin/data` применяет required/category checks после Zod shape validation. Это не полный schema registry с жёсткой проверкой каждого legacy option: custom/unknown values сохраняются. Не обещать closed enum validation по одному наличию `options`.

## 5. Variant architecture / admin editing

Variants embedded в Product, не самостоятельная коллекция. Отличаться могут id/SKU, localized label, attributes, price/oldPrice/tiers, stock status/quantity, image, quantity rules, price mode, unitPricing. `minOrder` поддерживается как legacy alias к `minQuantity`.

`ProductVariantsEditor.tsx` использует React Hook Form field arrays и применимые CMS definitions. Администратор выбирает понятную характеристику, не обязан вводить `storage`/`diameter`. Typed serialization сохраняет number/boolean/string[]; неизвестные legacy attribute keys не теряются при обычном редактировании.

Main Product schema допускает legacy extras (`passthrough`); variant schema строгая по полям сущности. Сохранность неизвестных attribute keys не равна разрешению произвольных новых top-level variant fields. Текущие validation limits: до 100 variants и 30 attributes у варианта.

Detail UI требует выбор варианта для добавления вариативного товара. Выбор определяет sale price и quantity rules, а не minimum preview другого варианта. Каталог возвращает Product, но не передаёт автоматически совпавшую configuration в detail selection.

## 6. Filtering architecture

Основные точки: `CatalogListing.tsx`, `FilterSidebar.tsx`, `lib/catalog/productFacets.ts`.

Pipeline: category scope → optional product search → applicable/filterable definitions с доступными значениями → facets → active applicable selections + ownProduction + stock → sort → ProductCard. Расчёты завязаны на memoized inputs; отсутствующий в новом scope key не продолжает скрыто фильтровать список. Без `currentCategory` (общий `/catalog`) `filterAttributes` пуст: attribute facets сейчас доступны в category/group scope, не глобально для всех товаров.

### Coherent configuration matching

Для каждого Product строится общий attributes record. При отсутствии `attributes.brand` туда виртуально добавляется `brandName` как `brand`; variant attributes затем могут override keys. Нет persistent aggregate facet fields или дублирования values в Firestore.

При variants matcher проверяет `some(configuration)`, внутри — `every(activeFilter)`. Для обычного Product configuration одна. Keys объединены через AND; выбранные options одного key через OR; discrete сравнение trim/case-insensitive. Пример A=256/Black, B=128/Blue: запрос 256+Blue не совпадёт.

### Stock-aware matching

`productMatchesAttributeFilters(product, selections, { inStockOnly })` включает наличие **внутрь того же `some`**, а не проверяет другой произвольный вариант.

- Configuration status: `variant.stockStatus ?? product.stockStatus`.
- Configuration quantity: именно `variant.stockQuantity`, без наследования product total.
- In stock: status `in_stock` и quantity отсутствует либо >0.
- Product без variants: product status и product quantity по тому же условию.
- Даже без attribute selections `inStockOnly` требует хотя бы один available variant. При выключенном stock filter unavailable variants могут совпадать, как и ожидается для полного каталога.

Таким образом 256/Black/0 + 128/Blue/10 не проходит 256+Black+inStockOnly; 256/Black/5 проходит; 256/Black/0 + 256/Blue/5 проходит storage=256+inStockOnly.

### Typed controls and facets

| Attribute.type | UI / matching |
| --- | --- |
| text, select, multiselect | Discrete options, array-aware matching |
| boolean | Включить условие true; отдельного выбора false сейчас нет |
| number, range | Inclusive min/max; numeric legacy strings, включая десятичную запятую |
| color | Discrete options, swatch если значение — CSS color |

`range` value — scalar, не `{min,max}` object. Facets собирают effective configuration values: base value, переопределённое всеми variants, не становится phantom option. Один Product считается один раз для option, независимо от количества совпавших variants. Numeric facet предоставляет min/max.

Counts **не contextual** относительно прочих активных фильтров/stock. Состояние filters локальное, не URL/query contract. Brand не имеет отдельной сущности: facet требует применимый filterable Attribute с key `brand`; заполненный legacy `attributes.brand` имеет приоритет над `brandName` в matcher.

## 7. Commerce / pricing architecture

`lib/commerce/productOffer.ts` — единые вычисления, `productPresentation.ts` — локализованное отображение.

| Понятие | Источник / алгоритм |
| --- | --- |
| Price mode | Variant override → Product → legacy showPrice fallback; fixed/from/request/informational |
| Sale unit price | `getProductUnitPrice`: `variant.price ?? product.price` |
| Order unit price | `getProductOrderUnitPrice`: sale либо highest applicable wholesale threshold |
| Sale preview | `getMinimumSalePrice`: min положительных priced offers при showPrice |
| Comparison preview | `getMinimumComparisonPrice`: min нормализованных offer prices в общей единице |
| Effective preview/sorting | `getEffectiveCatalogPrice`: comparison при opt-in и валидной конфигурации, иначе sale |

`getProductCatalogPriceText` применяется cards/search/print и связанными preview surfaces; price sorting использует тот же effective amount, не независимый старый `product.price`. «От» — >1 priced offer либо соответствующий mode `from`. Отсутствующая variant price наследует base. Preview не является расчётом конкретного quantity/wholesale заказа и не выбирает автоматически только in-stock offers.

Request-price остаётся заявкой без обещанного numeric total; informational не добавляется в cart. Отдельные price/showPrice/mode флаги сохраняют legacy semantics, их не заменяет normalized pricing.

### Unit/comparison price

Optional `ProductUnitPricing = { quantity, unit, displayUnit? }`, на Product и Variant; variant override либо product config. `catalogPriceBasis: 'sale' | 'comparison'` — на Product, default sale.

`normalized = salePrice / (quantity × sourceFactor / displayFactor)`.

- Mass: gram=1, kilogram=1000; volume: milliliter=1, liter=1000.
- Piece, meter и square_meter — отдельные dimensions, не взаимозаменяемы.
- pack/roll/box/custom не physical conversion units.
- Nonfinite/negative price, отсутствующая/неположительная quantity и несовместимые dimensions дают undefined. Helper допускает 0 price, но каталог собирает только positive priced offers.
- Общая display unit выбирается из product config, иначе первого configured offer. **Все** priced offers должны нормализоваться совместимо; частично настроенный товар fallback на sale preview, не вводящий в заблуждение минимум части вариантов.

1 кг за 165 000 и 25 кг за 3 625 000 дают минимум 145 000/кг; заказ второго варианта остаётся 3 625 000 за одну sales unit. Для 500 г source normalization делит цену на 0,5 кг.

**Comparison price — только presentation/comparison value; никогда самостоятельно не становится order price.** Legacy `price_per_kg` не импортируется автоматически в pricing truth. Currency conversion отсутствует: корректное сравнение preview предполагает согласованные currency и единицы ассортимента.

### SEO and print pricing

Product JSON-LD использует minimum **sale** Offer, не normalized amount, с product-level stockStatus. Это не AggregateOffer/полная variant inventory схема.

`/api/catalog/pdf` — redirect на локализованный `/catalog/print` с prices/lang/category, не бинарный PDF renderer. Server print page загружает public products/categories/attributes/settings/clients. `CatalogPrintDocument` использует общий preview formatter, A4 layout и `window.print()`; сохранение PDF — печать браузера. Backoffice order PDF — отдельный API и pdfmake, не этот endpoint.

## 8. Quantity & packaging architecture

`lib/commerce/orderQuantities.ts` нормализует quantity для client и server.

| Данные | Значение |
| --- | --- |
| `salesUnit` / `unitCode: QuantityUnit` | Заказываемая единица; localized legacy text / canonical code |
| `minimumOrder`, `quantityStep`, `maximumOrder` | Ограничения количества sales units |
| Variant minQuantity/minOrder, step/maxQuantity | Overrides product rules |
| `unitPricing.quantity` | Физическое содержимое **одной** priced sales unit, только для comparison |
| `orderPackaging` | Внешняя тара: название, unitsPerPackage, minimumPackages, packageStep |

При валидном enabled orderPackaging: minimum = unitsPerPackage × minimumPackages; step = unitsPerPackage × packageStep. Эти правила имеют приоритет над обычными min/step; max берётся из variant, иначе Product. Без упаковки min выбирается variant.minQuantity → legacy minOrder → product.minimumOrder; step variant → product → 1. Helpers clamp/snap и проверяют допустимое количество.

Пример: sales unit рулон, 11 пакетов в рулоне как attribute, box из 30 рулонов, minimumPackages=2 → cart quantity 60 рулонов. `packs_per_sack` не влияет на заказ, пока правило не выражено в orderPackaging. Нельзя использовать attribute и commerce field как независимые конкурирующие правила.

Упаковка 2 кг за 66 000: sales unit pack, quantity=1; contents для comparison=2 kg. Min/step не выводятся из comparison unit. `catchWeight` в модели не означает автоматический пересчёт оплаты по фактическому весу.

## 9. Cart and order integrity

`RequestCartContext.tsx` хранит `sanpack_request_cart_v1` в localStorage, восстанавливается после mount. Identity позиции — productId + variantId; сохранён Product/Variant snapshot. Add/update пересчитывает sale/tiers и quantity rules. При restore snapshots позволяют заново вычислить unit price; legacy item без snapshot сохраняет прежнюю unitPrice. Это **не** live refresh цен Firestore.

`PublicRepository.createRequest` отправляет идентификаторы/quantity/comment, customer/delivery, не доверенную client price. `/api/requests` + `orderService.ts`:

1. Проверяют strict checkout schema: name, phone, delivery address, date, delivery window, items; normalize phone.
2. Читают текущие Product из Firestore через Admin SDK, проверяют publication/variant selection, informational mode и quantity rules.
3. Считают sale/wholesale по серверным данным; comparison configuration не участвует.
4. Сохраняют `requests` snapshot, `originalItems`, totals, status/revision/audit trail. Unpriced items не превращаются в гарантированно бесплатные товары: это request-price workflow.
5. Отправляют Telegram notification после сохранения; сбой notification не отменяет уже принятую заявку.

Админский order PATCH — отдельный workflow статуса/редактирования с audit, не переиспользование недоверенного public total. Customer history требует customer session; номер телефона сам по себе не авторизация.

Граница: нет payment gateway, reservation/decrement stock или гарантии доступности quantity при submit. Наличие в filter — discovery rule, не WMS. Order contract сейчас UZS-oriented, даже при более общем поле currency у Product.

## 10. SiteSettings / white-label

`settings/global` → server public loader → locale layout/PublicProviders → SiteSettingsProvider/UI. `mergeSiteSettings.ts` сохраняет defaults старых документов; nested company/contacts/locale/design/seo и сервисные modules сливаются явно. Это не универсальный deep merge любого будущего объекта; commerce не получает такую же гарантию автоматически.

- Company name, logos/dark logo/favicon, localized descriptions; contacts и social links.
- Design: colors/radius/font preset/light-dark; `StorefrontTheme` строит semantic `--sp-*` variables. Legacy designVersion/font/radius adapters сохранены.
- Default SEO; service modules branding/bagDesigner enabled и navigation images.
- Sales/commerce/locale configuration присутствует, но не вся она динамически переопределяет routing/checkout (см. limitations).

Admin settings/contact UI позволяет редактировать identity/SEO/theme/services; приватные integrations — отдельные endpoints/documents. Generic contact UI использует company name. Own-production filter показывается только при наличии таких товаров в scope, отдельный generic tags engine не добавлялся.

SANPACK-specific About/marketing/page copy и seed остаются content layer. Технические cookie/localStorage keys не переименованы. Favicon metadata configurable, при этом статические `app/favicon.ico`/`app/icon.png` всё ещё существуют: при rebrand проверять фактически отдаваемые icons, а не только значение settings.

## 11. Admin, media and integrations

`/admin/products`, `/categories`, `/attributes` и `/settings` используют существующие editors, RHF/Zod и AdminRepository. `/api/admin/data` проверяет session, payload, category/attribute relationships, required values; пишет Admin SDK и инвалидирует public resource tags. Product CMS покрывает тексты/галерею/варианты/бренд/цены/quantity/packaging/related/documents/SEO/merchandising. Не каждый legacy field — отдельная новая CMS сущность.

Category save выполняет transaction: читает categories, проверяет итоговое поддерево/unique slug/reserved print, при создании Group проверяет отсутствие direct products, затем пишет. Parent selector использует ту же placement validation; дерево явно отображает Group/Category/Subcategory. Product selector показывает полный lineage и только depth1/2. Attribute selector позволяет назначать все три уровня и показывает наследование. Существующий media/SEO/sort/status workflow сохранён; drag-and-drop framework не добавлялся.

Media: `/api/admin/media`, `MediaUploadField`, `lib/media/*`. Upload в Firebase Storage с обработкой подходящих изображений/metadata; usage scanner защищает от обычного удаления используемого media. Ссылки и storage paths живут в соответствующих content fields. Local файл сам по себе **не** публикует изображение в Storage/production. Batch publication/import scripts — отдельные явные операции.

Admin Gemini endpoints поддерживают product-image generation и translations. API keys/private settings не отдаются публичному storefront. Категорийные иллюстрации могут быть подготовлены вне runtime, затем загружены/привязаны через media/CMS; универсального автоматического генератора категорий на public read нет.

Bag designer — отдельный модуль, `app/api/bag-designer/route.ts` с actions generate/submit, собственные types/settings. Сохраняет `bagDesignRequests` и Storage assets, использует Gemini, draft/idempotency lifecycle и distributed limits. Ready draft переходит в заявку при submit; cleanup tool только инспектирует stale drafts, не является работающим автоматическим scheduler. См. [cost control](operations/bag-designer-cost-control.md).

Telegram: отдельные login/start/callback/mini-app/customer session endpoints; серверная проверка identity, уведомления заказов/обращений. Private integration settings находятся вне SiteSettings. Backoffice documents используют `backofficeSettings/documents` и отдельный order document API.

## 12. Persistence / cache / compatibility

Основные коллекции: `products`, `categories`, `attributes`, `clients`, `banners`, `settings/global`, `requests`, `bagDesignRequests`; private settings Telegram/Gemini и backoffice document settings отделены от public config.

Trusted server reader получает коллекции Admin SDK. `publicProjection.ts` пропускает только published structurally valid Products, active Category lineage, active Banners и явные allowlists полей Product/Category/Attribute/Client/SiteSettings. Неизвестные top-level/nested Firestore fields не сериализуются. Это не server-side faceted index и не требует новых полей или migration.

Caching serverCatalogRepository: unstable_cache products 300s, categories/attributes/settings 1800s, banners 900s, clients 3600s; key включает project/seed mode и projection version. Admin writes вызывают resource-tag invalidation. Browser PublicRepository использует `/api/catalog` с no-store; отдельного browser cache слепка нет.

Seed-mode включается **только** `SANPACK_USE_SEED_DATA=true`. При live read failure `PublicDataUnavailableError`/503, а не незаметная подмена seed. Credentialless production-build guard отдельно блокирует remote reads; успешная сборка со seed/empty unavailable shells не проверяет live backend.

Сохраняются adapters: known-SKU Chinese seed localization, banner ZH fallback, generated local Product image при отсутствии mainImage, legacy category artwork maps, optimized local asset path rewrites. Следовательно «Firestore используется» не означает «ни одного local/seed-derived value».

Admin SDK инициализируется lazy из server service account JSON либо application default credentials; production — deployment identity, локально — корректный ADC. `.env.local`/private keys/tokens не документация. Public seed flag не блокирует privileged mutation endpoints автоматически.

Migration policy: read-only audit → dry-run → явно описанный deterministic patch → validation → согласованный apply. Сохранять IDs/slugs/URLs/images/order snapshots; не удалять legacy fields ради schema. Есть явные seed/import инструменты с writes — не запускать как безобидный repair. **В documentation-задаче migrations/backfills и изменения production не выполнялись.**

## 13. Internationalization, search and SEO

Routing `i18n/routing.ts`: RU/UZ/EN/ZH, locale prefix always. `SiteSettings.locale` не добавляет новый route locale без изменения кода. Используются next-intl/messages JSON вместе с LanguageContext, `translations.ts`, `pageCopy.ts` и localized entity fields; единого CMS для всех строк нет.

`localizedText.ts` возвращает resolved text и fallback metadata. Для missing ZH предпочтителен EN, затем RU/UZ; для остальных fallback RU/UZ/EN/ZH. Значение, совпадающее с RU в другом языке, может считаться fallback. Seed ZH adapters не означают полноту переводов. AI translation — явное admin действие и последующее сохранение, не runtime-перевод каждого просмотра.

`productSearch.ts` индексирует в памяти SKU Product, brand, localized names/descriptions. Typed attrs и variant SKU/attrs не входят в search text. Это сознательная текущая граница, не отдельный search backend.

Locale layout получает SiteSettings для default metadata/company identity/favicon. Product/category layouts строят localized metadata, canonical/hreflang и OG. Product JSON-LD — sale Offer (см. pricing). Dynamic sitemap сочетает static paths, active categories и published products для четырёх локалей; при backend failure dynamic lists пусты, static routes остаются, seed автоматически не включается.

Category routing: `[categorySlug]` сохранён; вложенный `[categorySlug]/[subcategorySlug]` добавлен без catch-all и конфликта с `/catalog/print`. Общий CategoryRoutePage и categoryMetadata используют resolveCategoryRoute/getCategoryPath. Group/Category URL flat, Subcategory nested без Group. Старый flat Subcategory slug → 308 canonical; неверный parent/slug и hidden lineage → 404. Breadcrumbs: home/catalog/Category[/Subcategory][/Product]. Slugs глобально уникальны. History старых nested paths после будущего reparent/rename не сохраняется; такой rollout требует отдельного redirect plan.

Product body остаётся большим client boundary с загрузкой public products, хотя server metadata читает данные отдельно. Наличие JSON-LD не означает полный SSR контент карточки товара.

## 14. Tests and validation

Vitest в Node с alias `@` и stub `server-only`; `tests/**/*.test.ts`. Группы: catalog applicability/presentation/facets/search/public guards, commerce normalization/quantities/offers, orders, validation, settings/theme, i18n, auth, media/gallery, bag-designer lifecycle.

Покрытые invariants включают product+variant inheritance, anti-cross-variant matching, typed values, шесть stock regressions, minimum preview/sorting, physical conversion/fallback, packaging/wholesale/cart-server pricing, required attributes и legacy compatibility. Smartphone/tire cases — synthetic unit fixtures, не доказательство прохождения любого будущего admin workflow в браузере.

Quality gate:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
npm run test:e2e
```

Playwright: desktop Chromium и iPhone-sized Chromium; seed-backed отдельный server, route/localization/404 smoke и axe. Mobile emulation не равна Safari на устройстве; эти tests не доказывают production checkout/Storage availability. CI использует Node 24, seed build и отдельный E2E job.

Исторический baseline до Subcategory: 30 files / 215 tests, build 89 страниц. Фактический quality gate текущего Subcategory-этапа — [HANDOFF](SUBCATEGORY_HANDOFF_2026-08-31.md). Добавлены hierarchy/scope/attribute/routing/metadata tests и реальные Admin API handler tests с mock Firestore. `npx playwright test --config=playwright.taxonomy.config.ts` запускает приложение во временной source copy с synthetic taxonomy, mock admin session/read и отключённым cloud/write доступом. Это проверка UI/SSR, не проверка production auth/Firestore credentials. Production taxonomy не изменялась; migrations не нужны для включения optional уровня.

## 15. Performance considerations

Listing фильтрует in-memory: примерно O(P × V × K) matching; построение facets обходит attributes/products/configurations и дедуплицирует значения. React memoization разделяет scoped/filtered computations, но configuration construction всё ещё повторяется в facet helpers. Cost зависит и от числа attributes, и от variants; это не константное время.

Для текущего каталога нет отдельного faceted search service/materialized facet index. Вводить инфраструктуру только после профилирования реального объёма. При росте проверять full-collection payload, повторный client/server product loading, высокую cardinality numeric facets и клиентский rendering; в этой documentation-задаче benchmark на 1 000 товарах не запускался.

Image optimization/Storage/WebP и tagged server caching решают другие затраты, не заменяют масштабируемый catalog index. Не считать arbitrary large catalog поддержанным только из-за универсальных TS types.

## 16. Security / data safety boundaries

- Firebase identity **не** даёт admin-права сама по себе. Сервер читает существующую коллекцию `admins/{uid}` на каждой проверке session: необходимы `active: true` и явная известная `role`. Отсутствующая/отключённая запись и ошибка чтения закрывают доступ. Перед rollout нужно отдельно подтвердить owner grant; автоматического bootstrap нет. Customer Telegram identity отдельная.
- Admin session проверяется сервером с revocation check; login требует свежий `auth_time` (5 минут). Cookie mutation endpoints защищены Origin-проверкой в Next proxy, login дополнительно в handler. Cookie-authenticated checkout тоже проверяет Origin. Роли проверяются в privileged handlers: настройки — owner, заявки — owner/sales, AI/media — owner/content; generic CMS writes остаются owner-only. Private writes используют Admin SDK, который обходит Firestore rules. Локальные rules теперь запрещают browser writes и прямое чтение заказов/admin grants даже администратору; используются server API. Изменённые rules **не применены в production**.
- Подготовленные Firestore rules deny all direct client reads/writes. Public boundary — trusted server + explicit projection; draft/hidden documents и неизвестные fields не уходят в client response. Rules ещё не применены в production, поэтому rollout выполняется только по Operations plan: сначала совместимый application revision, затем deny-all rules.
- Public order API валидирует IDs/quantity и пересчитывает цены; client snapshots, totals и phone не являются доверенной authority. Одинаковые Product/Variant строки нельзя дублировать для обхода maximumOrder. Request/informational price mode не возвращает старую числовую sale price в cart/order helper.
- Distributed limits используют Firestore transactions и whole-store ceilings, которые не зависят от IP/User-Agent и не обходятся spoofed forwarding headers. По умолчанию IP headers вообще не доверяются. Optional `TRUSTED_CLIENT_IP_HEADER` добавляет более строгий per-IP bucket только после доказанного edge overwrite/no-origin-bypass; неверное/пустое значение не отключает global ceiling. Admin AI остаётся UID-based; bag generation также имеет общий daily ceiling. JSON bounded до parse; App Hosting concurrency снижен до 8 при 1 GiB, но provider budgets/monitoring остаются operator controls.
- Storage namespaces разделены: `media/**` — public CMS get-only через rules; list/write/delete direct clients denied. `bag-design-requests/**` — private server-only. Новые customer assets не получают permanent Firebase download token и выдаются через short-lived signed `/api/bag-designer/asset` либо owner/sales session, с no-store/nosniff. Historical tokens требуют explicit dry-run/apply audit after rollout. Runtime SDK object access uses IAM and bypasses rules; bucket IAM must not grant `allUsers`/`allAuthenticatedUsers` access.
- API получает `private, no-store` и `noindex`; request/orders/profile/search/favorites/print — `noindex`. JSON-LD экранирует `<`, тексты React не вставляются как HTML. Critical server logs не включают upstream message/stack/cause.
- Secrets/private integration settings не должны оказаться в SiteSettings/public JSON, git, logs или документах. Не использовать production migrations для проверки гипотез.
- Production data, migration apply, media deletion, deployment — отдельные явно разрешённые действия. Подробные эксплуатационные шаги: [PRODUCTION_OPERATIONS.md](PRODUCTION_OPERATIONS.md).

Historical [Production Readiness & Security Audit](PRODUCTION_READINESS_SECURITY_AUDIT_2026-08-31.md) зафиксировал NOT READY. Текущий код/config plan закрывает его launch blockers; актуальное состояние — [Launch Blockers Remediation](LAUNCH_BLOCKERS_REMEDIATION_2026-09-01.md): **READY FOR CONTROLLED ROLLOUT**, но не утверждение о применённых production rules/IAM/grants/secrets.

## 17. Architectural invariants

1. Категория/характеристика новой ниши задаётся существующей CMS, без frontend conditions по smartphone/tire/SANPACK SKU.
2. Attribute definitions едины для Product и Variant; inheritance не дублирует source values.
3. Все variant filters и stock condition должны совпасть на одной configuration.
4. Effective preview и price sorting согласованы; sale/wholesale order price — отдельная семантика.
5. Comparison price и physical contents не изменяют order quantity/line total.
6. Server заново читает товар и рассчитывает цену заявки; browser cart не price authority.
7. orderPackaging — source of truth внешней упаковки, informational attrs не вторые правила заказа.
8. Optional extensions сохраняют старые Firestore документы/URLs/media и order compatibility.
9. SiteSettings — существующий identity layer, не повод создать второй configuration/domain engine.
10. Seed включается явно; live backend failures нельзя маскировать sample ассортиментом.
11. Taxonomy bounded: Group → Category → optional Subcategory, максимум три уровня. Category с детьми может иметь direct Products. Scope и inheritance вычисляются по parentId, не по копии persistent path.

## 18. Known limitations / deferred scope

- Не contextual facet counts, нет filter URL sync; attribute facets требуют category/group scope. Boolean filter true-only, generic CSS-color matching без словаря цветов.
- Search не индексирует attributes/variant SKU; matched variant не выбран автоматически после перехода из списка.
- Brand fields/legacy brand attribute могут расходиться; нет Brand pages или централизованной Brand CMS.
- Catalog preview не stock-filtered offer preview; JSON-LD product-level availability, не variant offer feed.
- Нет payments, stock reservation/decrement, catch-weight settlement, currency conversion; checkout UZS/Uzbekistan-oriented.
- CMS type/options validation не строгая schema registry для всех legacy значений; stockStatus/availability и некоторые reverse/legacy fields сосуществуют.
- Local/seed adapters, ZH gaps и SANPACK marketing content требуют отдельного white-label content review.
- Locale settings не dynamic locale registry; static icons и page-specific metadata требуют rebrand smoke.
- Большие client boundaries/full-collection trusted-server reads остаются scalability limitation; production IAM/secrets/rules/grant всё ещё нужно проверить и применить строго по controlled rollout plan.
- Tags/collections/richer badges/brand pages — отложенный P2, не недостающий фундамент текущего этапа.

`inStockOnly` по подходящему варианту **больше не limitation**. Не исправлять остальные пункты автоматически под видом документации или checkpoint.

## 19. Existing documentation: authority and discrepancies

| Документ | Как использовать / уточнение по текущему коду |
| --- | --- |
| [README](../README.md) | Setup/операции полезны; «checkout только name/phone» неполно: обязательны delivery address/date/window |
| [CATALOG_COMMERCE_ARCHITECTURE](CATALOG_COMMERCE_ARCHITECTURE.md) | Domain rationale сохранён. Boolean UI true-only; brandName fallback не override заполненного brand attr; from зависит от числа priced offers/mode; stock-aware matcher описан выше |
| [CATALOG_ADMIN_AUDIT_2026-08-29](CATALOG_ADMIN_AUDIT_2026-08-29.md) | Исторический gap/audit snapshot. Showcase fallback не любые ordered children, а curated+legacy union либо explicit image children |
| [CODEBASE_AUDIT_2026-08-29](CODEBASE_AUDIT_2026-08-29.md) | Риски/история, старые test counts и часть filter gaps уже не текущее состояние |
| [STOREFRONT_DESIGN_SYSTEM](STOREFRONT_DESIGN_SYSTEM.md) | Tokens/layout context; описание старых bento gradients/light cards и mobile header без language switch не восстановлять как норму |
| [UX blueprint](product-design/SANPACK_STOREFRONT_UX_BLUEPRINT.md) | Продуктовый план/намерения, не доказательство реализации каждой функции |
| [PRODUCTION_OPERATIONS](PRODUCTION_OPERATIONS.md), [bag-designer operations](operations/bag-designer-cost-control.md) | Эксплуатационный checklist; не утверждение, что cloud TTL/alerts или автоматический cleanup уже provisioned |

Старые документы не удалены и не переписаны в этой задаче. При расхождении сначала проверить implementation; эти уточнения описывают снимок рабочего дерева, а не вечную гарантию.

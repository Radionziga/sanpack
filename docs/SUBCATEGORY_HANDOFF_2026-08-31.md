# SANPACK — Optional Subcategory handoff

## Task

Добавить ровно один optional taxonomy level в существующий каталог, без нового catalog engine, persistent path/depth или массовой миграции. Проверить API, CMS, storefront, inheritance, scope, routing/SEO и backward compatibility; подготовить source ZIP для независимого review.

## Initial architecture

На начало работы: main, HEAD `2dcd7b77e4ba24b2cd14e35fd38a666ca6ad81df`, уже dirty working tree предыдущего catalog/commerce этапа (31 tracked modified и 8 untracked файлов). Эти изменения сохранены. Diff относительно HEAD включает **два этапа**, поэтому не приписывать все pricing/variant/stock изменения этой задаче.

Group и Category уже были Category documents с parentId; Product.categoryId указывал на Category. Attributes уже category-aware, со своим lineage; variants, stock-aware coherent filters, normalized pricing, CMS и SiteSettings уже существовали. Ограничения: API разрешал parent только Group, UI показывал два уровня, listing/home counts брали direct children, ссылки предполагали flat slug. PDF имел собственный recursive обход и мог повторно относить товар по устаревшему categorySlug.

Перед реализацией прочитаны PROJECT_MEMORY, ARCHITECTURE, CATALOG_COMMERCE_ARCHITECTURE, текущие types/API/editors/repositories/navigation/SEO и локальные инструкции Next.js 16.3.

## Changed

- Общие bounded lineage/depth/scope/visible/path/label/placement helpers.
- Server-side validation всего перемещаемого поддерева в Category save transaction.
- Дерево CMS на три уровня, безопасный parent selector, full-path product chooser, attribute chooser с наследованием на Subcategory.
- Вложенный route, canonical redirects, metadata/hreflang/sitemap, breadcrumbs и category links.
- Полноценные Group/Category/Subcategory product scopes, home counts/shelves и PDF selection.
- Desktop disclosures, компактные Category chips с optional navigation image, mobile scroll.
- Subcategory не попадает на главную автоматически, но допускается явный featured opt-in.
- Исправлен обнаруженный a11y fallback: showcase card без обложки использует читаемый тёмный текст, а не белый на светлом фоне.

## Files changed

Пути от корня проекта (все входят в ZIP):

| Файл / область | Роль этого этапа |
| --- | --- |
| `lib/catalog/categoryHierarchy.ts` | Новый shared helper поверх существующего Category |
| `lib/catalog/attributeApplicability.ts` | Подключение общего lineage вместо собственного обхода |
| `lib/catalog/categoryMetadata.ts` | Общие localized canonical/hreflang/title/description |
| `app/api/admin/data/route.ts` | Category transaction + bounded validation; Product допускает depth1/2 |
| `app/admin/(dashboard)/categories/page.tsx` | Три уровня, create/move parent UX, safe options |
| `app/admin/(dashboard)/products/page.tsx` | Full taxonomy path selector; применимость inherited definitions |
| `app/admin/(dashboard)/attributes/page.tsx` | Assignment Group/Category/Subcategory и inherited markers |
| `components/catalog/CategoryRoutePage.tsx` | Shared server route resolution/404/308/data loading |
| `app/[locale]/catalog/[categorySlug]/*` | Сохранён flat route, добавлен nested `[subcategorySlug]/page.tsx` |
| `components/catalog/CategoryNavigation.tsx` | Breadcrumbs и compact SubcategoryNavigation |
| `components/catalog/CatalogListing.tsx` | Shared scope/navigation/breadcrumbs; pricing/filter engine не переписан |
| `components/storefront/StorefrontPanels.tsx` | Sidebar third level, mobile Category rail, правильные ссылки |
| `app/[locale]/page.tsx`, `components/home/CatalogHome.tsx` | Descendant counts/shelves, homepage depth policy, no-image contrast |
| `lib/catalog/popularCategoryArtwork.ts` | Explicit Subcategory showcase opt-in, legacy Category compatibility |
| `components/search/StorefrontSearch.tsx` | Category result canonical path и lineage tooltip |
| `app/[locale]/product/[productSlug]/page.tsx` | Category/subcategory breadcrumbs/backlink |
| `app/sitemap.ts` | Canonical nested entries, active-ancestor visibility |
| `components/catalog/CatalogPrintDocument.tsx` | Shared scope, hierarchical selection, ID precedence to avoid duplicates |
| `types/index.ts` | Только пояснение parentId taxonomy semantics; новых schema fields нет |
| `tests/fixtures/categories.ts` | Synthetic three-level taxonomy/definitions |
| `tests/catalog/categoryHierarchy.test.ts` | Depth/move/scope/inheritance/legacy/paths/SEO/showcase regression |
| `tests/api/categoryMutation.test.ts` | Настоящий POST handler с mock auth/Firestore; invalid saves и required inheritance |
| `tests/catalog/categoryRoute.test.ts` | Настоящий route boundary и sitemap с repository mocks |
| `tests/e2e/subcategories.spec.ts` | Реальные SSR/UI flows для fixture category/subcategory/admin/print |
| `tests/e2e/start-taxonomy-fixture.mjs` | Изолированная копия приложения; не загружает env/secrets, cloud/admin writes запрещены |
| `playwright.taxonomy.config.ts`, `playwright.config.ts` | Отдельный безопасный smoke suite; обычный suite не требует fixture taxonomy |
| `docs/PROJECT_MEMORY.md`, `docs/ARCHITECTURE.md`, `docs/CATALOG_COMMERCE_ARCHITECTURE.md` | Обновлённые invariants и границы |

## Taxonomy model / Data model

Сохраняется Category collection и parentId. Group определяется отсутствием parent; Category имеет parent Group; Subcategory имеет parent Category. `MAX_CATEGORY_DEPTH = 2` означает **три уровня**, считая root depth0. Дочерний узел Subcategory запрещён.

Тип/роль вычисляются по текущему lineage, поэтому допустимое перемещение leaf Category под другую Category делает её Subcategory; subtree moves проверяются целиком. Self-parent, cycle, move into descendant, missing/invalid ancestry, depth overflow отвергаются и на клиенте, и API. Slugs глобально уникальны, `print` зарезервирован. Group с direct products создать через превращение товарной Category нельзя.

Валидация Category mutation и её запись находятся в одной Firestore transaction. Никаких `CategoryNode`, `TaxonomyNode`, отдельной collection `subcategories` или persistent Product.categoryPath не добавлено.

## Product assignment

Существующий Product.categoryId указывает на depth1 или depth2. Direct Category products не обязаны переезжать после создания Subcategory. Product.groupId отсутствует и не нужен. Canonical categoryId имеет приоритет над старым categorySlug; legacy slug fallback остаётся, если ID не разрешается. Admin save актуализирует categorySlug.

## Scope behavior

| Страница | Товары |
| --- | --- |
| Group | Direct Category products + все Subcategory products ветки |
| Category | Собственные products + products direct Subcategories |
| Subcategory | Только её products |

Общий getProductsInCategoryScope/getCategoryScopeIds используется listing/home/counts/PDF. Storefront navigation/routes учитывают active status всех ancestors. Общий /catalog и публикация Products не превращены в новую систему access control. Скрытие Category не равно удалению/распубликации её Product documents.

## Attribute inheritance

Attribute.categoryIds остаётся source of truth. Universal definitions применимы везде. Group definition наследуется Category и Subcategory; Category definition — её Subcategories; definition конкретной Subcategory не применяется sibling. Required/filterable/cardVisible/productVisible используют прежние helpers/definitions. ProductVariantsEditor получает тот же category-aware набор; required может быть заполнен на Product либо на каждом Variant по существующим правилам. Новый attribute engine не создавался.

## Storefront UX

Desktop: раскрываем Group и Category, показываем только известный третий уровень. Expanded overrides позволяют закрыть даже активную ветку. Mobile: существующий горизонтальный rail основных Categories сохранён, активная Category определяется через lineage; ниже — «Все» и Subcategories отдельным компактным scroll-блоком. Без navigationImage chips остаются текстовыми и аккуратными.

Homepage: прежний curated/legacy Category showcase, основные shelves depth1. Subcategories не захватывают главную из-за одного факта создания или наличия картинки; explicit featured:true допускается существующим merchandising mechanism. Navigation/bento fields не смешаны; обязательная cover для Subcategory не введена.

## URLs / SEO

- Group/Category: `/ru/catalog/slug` и остальные поддерживаемые locale prefixes.
- Subcategory: `/ru/catalog/category-slug/subcategory-slug`, без Group в URL.
- Сохранили `[categorySlug]`, добавили вложенный `[subcategorySlug]`; без catch-all taxonomy route.
- Старый flat Subcategory slug → permanent 308 на nested canonical.
- Неправильная пара parent/slug, hidden ancestor или неверный lineage → 404, не дублированная страница.
- Canonical/hreflang/x-default, sitemap и navigation/search links строятся общим helper.
- Breadcrumbs: Home → Catalog → Category → optional Subcategory → optional Product, Group опущена над товарной Category по заданному UX.
- Category SEO title/description/localized fields сохранены. Новая structured-data subsystem не создавалась; product sale Offer не менялся.

## Admin UX

Можно создать Group, Category, Subcategory; видеть уровни; выбирать parent по полному пути; переносить между допустимыми ветками; менять existing images/status/sortOrder/SEO; назначать definitions всем уровням. Product chooser показывает, например, `food / grocery / grains`, а не неоднозначный leaf label. При выборе автоматически наследуются Group/Category/Subcategory definitions, включая варианты.

Реальный browser smoke проверяет формы и локальный selection state с read-only fixture API. Реальные API save rules проверяются отдельно через Vitest POST handler; live Firebase login/write не тестировался ради защиты production. Fixture запускается через production build/start во временной копии. Только в этой копии typecheck сборки отключён для неполных Firebase/auth test stubs; основной working tree отдельно проходит настоящий typecheck и build с ignoreBuildErrors:false. Это не обход quality gate основного source.

## Compatibility

Старые documents не требуют новых полей. IDs/slugs/products/images/localization/prices/variants/order snapshots не мигрированы. Старые flat Category URLs остаются flat; если категорию позже переместят под другую, её прежний flat slug работает как redirect. Legacy artwork maps и Category.attributeIds сохранены, последний не становится второй inheritance truth.

## Data / migrations

**Production data НЕ изменялись. Firestore writes НЕ выполнялись. Migrations/backfills НЕ применялись.**

Для code deployment без Subcategories migration не нужна. Реорганизация SANPACK taxonomy ниже — только рекомендация; требуется отдельное одобрение и read-only/dry-run/validation/apply workflow. Audit прочитал только collections categories/products через публичный Firestore REST. API/unit fixtures держали writes в памяти, runtime fixture блокирует cloud/Admin POST.

## Tests / validation

- `npm test`: **33 files, 259 tests passed** (44 новых теста относительно baseline 30/215).
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run build`: exit 0, 89 generated static pages; dynamic nested category route присутствует в route table, `/catalog/print` сохранён.
- `git diff --check`: exit 0; untracked Markdown/source дополнительно проверяются при передаче.
- `npx playwright test --config=playwright.taxonomy.config.ts`: **29 passed, 1 intentionally skipped**, exit 0, 3.5 минуты (production fixture runtime). Пропущен только desktop disclosure в mobile project; mobile navigation отдельно прошла.
- In-app Browser: визуально просмотрены nested Category page на обычной ширине и 390×844, sidebar/breadcrumbs/chips/product listing. Viewport reset, временная вкладка закрыта.
- Synthetic performance check: 121 taxonomy nodes, 100 повторов counts всех узлов: ~19.3 ms при 100 Products, ~22.3 ms при 1 000 Products на этой машине. Это benchmark pure helpers, не production SLA. Runtime читает коллекцию Categories целиком/cache, не N+1 для ancestors. Для текущих 28 nodes специальный index/cache не нужен.

Smoke включает прежние storefront/locales/404/axe scenarios и новые category/subcategory/group listing, alias redirect, invalid parent, canonical/hreflang, product back navigation, desktop disclosure, admin parent/product workflows и PDF scope. Desktop-only disclosure намеренно пропущен в mobile project; mobile chips проверяются обоими navigation сценариями.

Первый fixture запуск выявил пропущенный root stylesheet в копии; fixture исправлен. Следующий выявил реальный no-image contrast bug и два неверных test selectors; исправлены. При параллельной нагрузке cold webpack compile превышал 90s; в долгом dev-прогоне наблюдались pending RSC transitions/таймауты (в том числе на старых страницах). Финальный harness использует production Webpack build/start временной копии без standalone (из-за внешнего read-only symlink node_modules), 180s test/startup и 15s expect, без ослабления assertions. Dev-прогоны с failures/interruption не выдаются за успешные; финальный production fixture suite полностью прошёл, включая тот же mobile переход.

## Problems found / fixed

1. API parent обязан быть root → replaced by bounded lineage/subtree validation.
2. Direct-children scope терял grandchildren → shared descendant scope.
3. Flat links/canonicals не отражали новую структуру → единый path resolver + nested route + alias redirect.
4. Product editor не объяснял lineage, attribute chooser пропускал Subcategories → full paths / third-level assignment.
5. Legacy recursive PDF traversal мог зациклиться на повреждённом дереве, stale slug давал неверное отнесение → bounded scope и ID precedence.
6. Active branch disclosure невозможно было нормально закрыть → явные expansion overrides.
7. Featured Category без artwork имела белый текст на светлом фоне → dark-text no-image fallback на desktop/mobile.

## Not changed

Pricing, variant model, inventory/stock engine, unitPricing, quantity rules, wholesale, checkout, payments, brands и коллекции не менялись в этом этапе. Existing dirty commerce changes сохранены, не переавторствованы. Не исправлялись contextual facets, URL filter state, attribute search indexing, Brand pages, tags/collections, ZH content cleanup. No new services/dependencies/drag-and-drop framework.

## Remaining limitations / Risks

- Category slugs всё ещё globally unique; одинаковый leaf slug под разными parents не поддерживается.
- Автоматическая история старых **nested** paths после последующего reparent/rename не хранится. Flat aliases работают; при следующей реорганизации нужна явная redirect policy.
- Статические SANPACK footer/marketing ссылки исторически содержат legacy slugs и не становятся динамической CMS в этом этапе.
- Весь catalog пока читается коллекциями; shared helpers predictable при bounded depth, но не специализированный индекс огромной taxonomy.
- Production Firebase transaction/credentials и live-auth admin save не запускались. Конкурентные Category moves используют transaction; синхронизация с одновременно выполняющимся Product save/delete не переработана в общий transactional catalog engine.
- Raw Firestore writes/import scripts могут обходить API validation. Перед отдельным apply необходимо проверять итоговое дерево. Исторические scripts не следует запускать автоматически как миграцию Subcategory.
- Live Products остаются published при скрытии Category; глобальные product visibility/security semantics не менялись.
- E2E mobile = Chromium emulation, не физический iPhone/Safari. Fixture products без фото намеренно показывают placeholders; это не отсутствие production images.
- Новые родительские required attributes начинают действовать при следующем сохранении Product; move не переписывает значения существующих товаров. Перед reorganize нужен audit attribute applicability.

## SANPACK taxonomy proposal — READ ONLY, NOT APPLIED

Фактическое чтение 2026-08-31: **238 Product documents**, **28 Category documents** (2 Groups + 26 Categories, без Subcategory). Числа ниже — Product documents, не SKU вариантов. Упаковка 39, продукты питания 199.

Рекомендуемое первое объединение:

```text
Продукты питания
├── Бакалея — 31
│   ├── Крупы и бобовые — 13
│   ├── Мука — 8
│   ├── Сахар, соль и специи — 6
│   ├── Ингредиенты для выпечки и сухофрукты — 3
│   └── Соусы, пасты и консервация — 1
├── Молочная продукция — 12
│   ├── Сыры — 8
│   └── Сливочное масло — 4
├── Мясо и птица — 21
│   ├── Говядина — 12
│   └── Курица — 9
├── Зелень — 32 (до отдельной проверки редиса)
│   ├── Свежая зелень — 20
│   └── Микрозелень — 12
├── Растительные масла — 2, пока без подкатегорий
├── Фрукты — 43, без дробления
├── Ягоды — 12, без дробления
├── Овощи — 44, без дробления
├── Яйца — 1
└── Замороженные продукты — 1
```

Бакалея 31: сейчас крупы17 + мука8 + сахар1 + соль2 + дрожжи2 + томатная паста1. Из нынешних круп перенести: GR-013 «Ош магиз» (изюм) в ингредиенты/сухофрукты; GR-014/015 кунжут и GR-016 чёрная седана в сахар/соль/специи. Получается крупы13, сахар/соль/специи6, ингредиенты/сухофрукты3. Если не хочется переименовывать baking section под один изюм, оставить изюм непосредственно в Бакалее — это уже допускается моделью (2 в baking + 1 direct Product). Пустой раздел «Макароны» не нужен: их нет в текущем списке.

Молочная продукция: DA-001/002/003/004 — 4 Product сливочного масла; DA-006…013 — 8 сыров. Это самое очевидное непересекающееся разделение без изменения variants.

Зелень: текущая fresh category содержит редис GN-027; перед apply уточнить перенос в Овощи (тогда fresh19, овощи45). Микрозелень12 относится к Nova Green: это brand, не дополнительный уровень taxonomy. Seller/brand semantics в этом этапе не менялись.

Масла: Oleina 5 л + Unity фритюрное 10 л. «Для фритюра» — назначение/Attribute, не sibling «растительным». Не создавать пустую olive Subcategory. Фрукты/овощи использовать с attributes сорта/страны/фасовки, не плодить дерево без устойчивых покупательских направлений.

Упаковка: сохранить пока 8 основных Categories: мусорные8, отрывные2, майка5, вакуумные/специальные4, пищевая упаковка5, перчатки4, хозяйственные4, бумажная продукция7. Разделять их на Subcategories при текущем размере необходимости нет.

Это mapping-рекомендация; **ни один из 238 товаров не перенесён**, новые production parents не созданы. Перед apply сохранить IDs/slugs, назначить images новых основных Categories и пересмотреть featured flags: перенесённые legacy Categories теперь Subcategories и по умолчанию не заполняют homepage автоматически.

## Documentation

Обновлены PROJECT_MEMORY, ARCHITECTURE, CATALOG_COMMERCE_ARCHITECTURE. Старый двухуровневый invariant заменён optional Subcategory, max3, direct products, bounded scope/inheritance и compatibility. Исторические audit docs оставлены как snapshots, не переписаны задним числом.

## Git state

- Branch: `main`.
- Initial/current HEAD: `2dcd7b77e4ba24b2cd14e35fd38a666ca6ad81df`.
- Есть modified и untracked файлы текущего и предыдущего этапов; они входят в source ZIP.
- **Commit / push / deploy не выполнялись.** Production data не изменялись.
- Generated `next-env.d.ts` зависит от последнего Next dev/build; это не изменение domain logic.

## Recommended next step

Независимый review полного ZIP + этого handoff. Затем по отдельному разрешению checkpoint commit; отдельно согласовать точный production mapping, audit inherited required attrs/showcase/redirects, deterministic dry-run и apply. Не смешивать это с отложенными commerce limitations.

## Review archive

Локальный архив текущего рабочего дерева, не git archive HEAD:
`/Users/milana/Desktop/Sanpack/SANPACK_PROJECT_SOURCE_2026-08-31_2dcd7b7_SUBCATEGORIES.zip`.

Содержит source/frontend/backend/admin/lib/types/tests/scripts/docs/config/lockfile/.env.example/public assets и SHA-256 manifest. Исключаются .git, node_modules, .next, caches/build artifacts, reports/logs, outputs/scratch/temp/backups/старые архивы, AI/IDE-local dirs, реальные env/credentials/keys. Автоматический scan ищет secret patterns и реальные secret values из local env; ZIP повторно проверяется после упаковки. Public Firebase project IDs и публичные media URLs не являются приватными credentials.

После распаковки: `npm ci`; для demo создать локальные env по .env.example и явно включить SANPACK_USE_SEED_DATA=true. Next генерирует свои types при dev/build/typegen. Seed-mode сам по себе **не отключает writes** основного приложения; только специальный isolated E2E fixture блокирует cloud/writes.

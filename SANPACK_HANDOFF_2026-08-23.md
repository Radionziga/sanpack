# SANPACK — полный отчёт для переноса проекта

Дата подготовки: 23 августа 2026 года
Рабочая папка: `/Users/milana/Desktop/Sanpack/SANPACK`
Ветка: `main`
Текущий HEAD: `c765d494c5229faa256a2c58b7dc7fe573ef5a85`
Последний commit: `c765d49 fix(catalog): stabilize variant image gallery`

## 1. Назначение документа

Этот файл предназначен для передачи проекта SANPACK на другой компьютер и продолжения работы в новом Codex-чате. Это существующий production-проект, а не заготовка и не новый проект.

Архив рядом с этим документом содержит исходный код, конфигурацию, изображения, project-local skills, тесты, скрипты и lockfile. В архив намеренно не включены секреты, установленные зависимости, результаты сборки и кэши.

## 2. Текущее состояние

- Production-сайт: `https://sanpack.uz`
- GitHub: `https://github.com/Radionziga/sanpack.git`
- Firebase / Google Cloud Project ID: `stamply-4df8a`
- Firebase Storage bucket: `stamply-4df8a.firebasestorage.app`
- Основная ветка: `main`
- Локальная ветка не отстаёт от `origin/main` и опережает её на 51 commit.
- Ahead/behind для `origin/main...main`: `0 51`, то есть behind `0`, ahead `51`.
- Ветка `main` технически настроена отслеживать `transfer-bundle/main`, поэтому короткий `git status` показывает `ahead 48` именно относительно старого bundle. Для сравнения с GitHub всегда использовать явную команду `git rev-list --left-right --count origin/main...main`.
- Push этой сессией не выполнялся.
- Deployment этой сессией не выполнялся.
- Последний полностью зафиксированный исходный код находится в commit `c765d49`.
- В snapshot также входят намеренные незакоммиченные изменения нового UX поиска/каталога. Они перечислены ниже; их нельзя потерять или принять за случайный мусор.
- Сам этот Markdown-файл является новым переносным документом и намеренно не коммитится.

Настроенные remotes:

```text
origin          https://github.com/Radionziga/sanpack.git
transfer-bundle /Users/milana/Desktop/Sanpack/sanpack.bundle
```

Для ZIP создаётся отдельный актуальный Git bundle `SANPACK_CURRENT_c765d49_2026-08-23.bundle`, содержащий commit `c765d49` и всю достижимую историю. Старый файл `sanpack.bundle` не удаляется и не перезаписывается. Незакоммиченные изменения находятся в файловом snapshot и дополнительно сохраняются отдельным patch-файлом внутри ZIP.

## 3. Стек проекта

- macOS 26.3.1, Apple Silicon `arm64`
- Git 2.50.1 (Apple Git-155)
- Node.js 24.9.0
- npm 11.6.0
- Next.js 16.3.0
- React 19.2.1
- TypeScript 5.9.3
- Tailwind CSS 4.1.11
- Vitest 4.1.11
- Firebase Web SDK 12.17.0
- Firebase Admin SDK 14.2.0
- Firebase CLI 15.24.0
- Google Cloud SDK 581.0.0
- next-intl 4.13.4
- React Hook Form 7.83.0
- Zod 4.4.3
- Sharp 0.35.3
- pdfmake 0.3.11
- Lucide React 0.553.0

В проекте используется npm. Не переходить на yarn, pnpm или Bun.

## 4. Архитектура

Основные каталоги:

- `app/[locale]/` — публичная витрина с маршрутами RU/UZ/EN;
- `app/admin/` — административная панель владельца;
- `app/api/` — серверные API-границы;
- `components/` — общие и предметные React-компоненты;
- `context/RequestCartContext.tsx` — корзина заявки;
- `lib/repositories/` — public/admin/server repositories;
- `lib/commerce/` — правила цены, количества и упаковки;
- `lib/orders/` — доверенные server-side snapshots заказов;
- `lib/catalog/` — seed-каталог, презентационная локализация и каталоговые helpers;
- `messages/` — UI-переводы next-intl;
- `public/` — изображения, шрифты и публичные assets;
- `scripts/` — миграционные и служебные скрипты;
- `tests/` — Vitest-тесты;
- `.agents/skills/` — project-local инструкции Codex;
- `types/index.ts` — товарная и commerce-модель.

SANPACK рассматривается как переиспользуемая commerce-платформа для одного владельца магазина. Это не marketplace: сторонних продавцов и seller accounts нет. SANPACK/HoReCa-значения должны находиться в конфигурации текущего магазина, а не в универсальной бизнес-логике.

## 5. Что было сделано за программу упорядочивания

### 5.1. Защитная сетка и исходный baseline

- Проведён read-only аудит Git, storefront, admin, API, Firebase, Telegram, Gemini, media, локализации, дизайн-токенов и временных материалов.
- Исправлена загрузка мобильного поиска каталога без обновления state после unmount.
- Добавлен Vitest без лишнего браузерного test stack.
- Зафиксированы characterization-тесты commerce-логики: minimum, step, варианты, внешняя упаковка, дробные количества, обязательный variantId, SKU и цена варианта, нулевая цена, серверное ограничение maximum.
- Созданы checkpoint и последовательные небольшие тематические commits.

### 5.2. Честное поведение публичного каталога

- Публично выдаются только товары со статусом `published`.
- Ошибка Firestore больше не маскируется под успешно загруженный seed-каталог.
- Empty catalog и infrastructure failure разделены.
- Посетителю показывается человеческое состояние временной недоступности без Firebase/Firestore/stack trace.
- Credentialless build отдельно проверяет допустимый режим и не превращает production-сбой в ложный успех.

Ключевые commits:

```text
a7aaa3c fix(catalog): expose only published products publicly
56aff84 fix(catalog): fail honestly when public data is unavailable
39053cc fix(catalog): preflight credentialless builds before cache
```

### 5.3. Admin authorization

- Подготовлена авторизация администратора через документ `admins/{uid}`.
- Firebase identity отделена от прикладной admin authorization.
- Добавлена backward-compatible логика и тестируемые границы.
- Enforcement нельзя бездумно включать на новом окружении, пока подтверждён production admin document владельца.

Commit:

```text
11524b0 fix(auth): prepare admin document authorization
```

### 5.4. Bag Designer, контроль стоимости и lifecycle черновиков

- Ограничена стоимость генераций.
- Уточнена валидация запросов и lifecycle draft-записей.
- Подготовлена безопасная dry-run проверка устаревших черновиков.
- Process-local limiter не выдаётся за распределённую защиту.
- Внешнее rate-limit хранилище и scheduler всё ещё требуют отдельного инфраструктурного решения перед production-внедрением.

Commit:

```text
7b14d0b fix(bag-designer): bound generation cost and draft lifecycle
```

### 5.5. Commerce-логика

- Согласованы правила доступности offer и количества.
- Исправлено сохранение допустимых нулевых денежных значений: `0` больше не подменяется через логическое `||`.
- Типы вариантов приведены в соответствие с допустимыми availability values.
- Усилена серверная валидация полных товарных записей.
- Валидация mutation body и server snapshots стала строже.

Ключевые commits:

```text
32eb5c9 fix(commerce): align offer and quantity rules
a5d11e3 fix(orders): preserve zero monetary amounts
6551233 fix(types): align variant availability values
6b667c5 fix(admin): validate complete product records
f6d57b9 fix(api): reject malformed mutation bodies
```

Открытое продуктовое решение: окончательная семантика tier pricing — считать tiers по единицам или упаковкам, как объединять product/variant tiers и как использовать их в cart, Telegram и PDF. Это нельзя менять без явного согласования владельца.

### 5.6. Локализация интерфейса и контента

- Исправлено получение locale из маршрута и server-rendered языка страницы.
- Content fallback сделан явным и тестируемым.
- Названия товаров больше не считаются переведёнными только потому, что русская строка скопирована в поля UZ/EN.
- Переведены названия, варианты, SEO-поля, единицы измерения и значения характеристик.
- Исправлены регистр, узбекские апострофы и английские единицы измерения.
- На странице товара и в фильтрах сырые значения (`упаковка`, `Сыр` и т.п.) заменены локализованным представлением.
- Проверен товар Svalya:

```text
RU: Сыр Svalya, 3 кг
UZ: Svalya pishlog‘i, 3 kg
EN: Svalya cheese, 3 kg
```

- Проверены подписи `Qadoq uchun narx`, `Miqdori (qadoq)`, `Price per pack`, `Quantity (pack)`.
- Добавлены тесты, запрещающие пустые локализованные названия, кириллицу в UZ/EN seed-названиях и неверные единицы.

Ключевые commits:

```text
995a20f fix(i18n): render locale from the route
c30e4b8 fix(i18n): make content fallback explicit
e9f4b15 fix(catalog): localize product data across storefront
```

Главные файлы последней локализационной работы:

- `lib/catalog/seedProductLocalization.ts`
- `lib/catalog/productPresentation.ts`
- `lib/catalog/sanpackPriceLists2026.ts`
- `app/[locale]/product/[productSlug]/page.tsx`
- `components/catalog/FilterSidebar.tsx`
- `scripts/localize-firestore-products.mjs`
- `tests/catalog/productLocalization.test.ts`

### 5.7. Production Firestore и Gemini

Владелец отдельно разрешил Google/Firebase-авторизацию, Gemini-вызовы и массовую запись переводов.

Выполнено:

- Установлен Google Cloud CLI 581.0.0 через Homebrew.
- Выполнены Google user login и Application Default Credentials login.
- Активный проект установлен в `stamply-4df8a`.
- Для ADC установлен quota project `stamply-4df8a`.
- Production `privateSettings/gemini` найден, включён и содержит настроенный зашифрованный ключ.
- Ключ расшифровывался только в памяти с использованием Secret Manager; значения, части ключа, длины и checksum не выводились.
- Скрипт `scripts/localize-firestore-products.mjs` сначала выполнен в dry-run.
- Моделью `gemini-3.6-flash` подготовлено и проверено 513 локализуемых полей для 164 товаров и их вариантов.
- Перед записью создан полный backup коллекции products.
- В production Firestore обновлены только переводимые поля 164 product documents.
- Независимый post-write аудит показал:

```text
total products:             164
missing UZ titles:            0
missing EN titles:            0
Cyrillic in UZ:               0
Cyrillic in EN:               0
UZ duplicated from RU:        0
EN duplicated from RU:        0
protected field changes:      0
updated by migration:       164
```

Защищённые поля, проверенные на неизменность:

- `sku`, `slug`, `status`;
- `categoryId`, `categorySlug`;
- `titleRu`;
- `price`, `currency`, `showPrice`;
- `stockStatus`, `minimumOrder`, `salesUnit`, `unitCode`, `quantityStep`;
- `priceMode`, `availability`;
- `images`, `mainImage`;
- `attributes` как исходная товарная структура.

Файлы вне Git-репозитория на исходном Mac:

```text
/Users/milana/Desktop/Sanpack/firestore-backups/products-before-localization-2026-08-22T18-48-14-159Z.json
/Users/milana/Desktop/Sanpack/firestore-product-translations-review.json
```

Оба файла имеют permissions `600`. Они не являются заменой Firestore export и должны храниться как конфиденциальные служебные материалы.

Оба служебных файла включены в итоговый ZIP рядом с папкой проекта, чтобы не потерять результат миграции и возможность точечной проверки/отката. На новом компьютере их следует хранить локально, не добавлять в Git и не публиковать.

### 5.8. Изображения и placeholder

- В seed-каталоге восстановлена привязка существующих товарных изображений.
- В `public/` находится 246 файлов, включая 118 JPEG, 87 PNG, 15 WebP, 5 SVG и 21 WOFF2.
- Реальные изображения товаров снова используются там, где они существуют.
- Для товаров без фотографии используется локализованный placeholder с сообщением о том, что фото скоро появится.
- Placeholder зависит от выбранного языка RU/UZ/EN.
- Качество исходных фотографий намеренно не улучшалось в последнем проходе: для этого нужны более качественные оригиналы или отдельная media-обработка.

Production-аудит ранее выявил товары без изображения:

```text
SP-GN-027
SP-PG-007
SP-TB-004
SP-VB-001
SP-VB-002
SP-VB-003
```

Commit восстановления seed-изображений:

```text
1d5c023 feat(catalog): restore seed product imagery
```

### 5.9. UI, тема и cleanup

- Восстановлены semantic focus states и theme tokens.
- Убраны storefront brand defaults из универсального Theme Provider.
- Репозитории получили нейтральные имена.
- Удалены доказанно неиспользуемые legacy CSS aliases.
- Информационные карточки переведены на общие theme primitives.
- Retry/error/notice состояния унифицированы.
- Mobile overlays учитывают safe-area.
- Удалён неиспользуемый anonymous customer auth client после проверки маршрутов и зависимостей.
- Убраны остаточные runtime color overrides.
- Улучшен контраст пользовательских brand colors.
- Добавлены тесты режимов темы и границ radius.
- Storefront logo вынесен в конфигурируемый компонент.
- PDF и document identity получают бренд и тему из настроек, а не из жёстко встроенных SANPACK defaults.

### 5.10. Admin и API hardening

- Добавлена валидация mutations атрибутов, партнёров, баннеров и полных продуктов.
- Ошибки удаления каталога и мутаций партнёров больше не маскируются под success.
- Typed product attributes сохраняются корректно.
- Неизвестные Gemini и order infrastructure errors скрываются от публичного ответа; посетитель не видит внутренние детали.
- Граница attribute enforcement отдельно документирована.

### 5.11. Единый современный PDF-каталог

Публичная кнопка каталога раньше вызывала старый серверный генератор `lib/documents/createCatalogPdf.ts` на pdfmake. Административный раздел `/admin/pdf-catalog` уже использовал современный A4 print studio через `components/catalog/CatalogPrintDocument.tsx`. Из-за двух параллельных реализаций посетитель получал устаревший PDF, а публичное модальное окно оставалось русским на узбекской и английской страницах.

В commit `02d1f98` выполнено:

- старый 706-строчный генератор `lib/documents/createCatalogPdf.ts` удалён;
- `/api/catalog/pdf` сохранён как backward-compatible endpoint, но теперь отвечает безопасным `307` redirect на современный локализованный print route;
- публичные кнопки сразу открывают `/[locale]/catalog/print` с параметрами языка и отображения цен;
- ссылки из admin также ведут в единый современный print flow;
- добавлен `getCatalogPrintPath` и покрывающие его тесты;
- создан отдельный namespace `catalogPdf` во всех `messages/ru.json`, `messages/uz.json`, `messages/en.json`;
- toolbar, cover, footer, действия печати/копирования, подписи количества, placeholder и даты локализованы для RU/UZ/EN;
- убраны жёстко заданные `/ru`-ссылки;
- модальное окно получило Escape-close, focus trap, восстановление фокуса, блокировку фонового scroll и доступную кнопку закрытия.

В браузере подтверждены английское модальное окно и современная A4-страница с действиями `With prices`, `Without prices`, `Print / Save as PDF`.

### 5.12. Галерея товара и варианты

В commit `c765d49` стабилизирована логика изображений для вариантов:

- создан чистый helper `lib/catalog/productGallery.ts`;
- selected variant image всегда идёт первым;
- пустые изображения и placeholders отфильтровываются;
- дубликаты удаляются;
- галерея теперь получает `mainImage`, массив `images` и изображение выбранного варианта;
- при смене варианта прежний выбор изображения не остаётся ошибочно активным;
- rail thumbnails не исчезает при единственном изображении;
- активная рамка больше не должна обрезаться из-за `scale`/`ring` внутри overflow-контейнера;
- добавлен namespace `productGallery` и доступные подписи RU/UZ/EN;
- добавлено 3 unit tests.

В браузере для Svalya butter подтверждено: вариант 1 кг показывает 2 thumbnails, вариант 25 кг — 1 thumbnail, выбранный thumbnail имеет корректный `aria-pressed` и рамка не обрезается.

Известная незавершённая визуальная проверка: после переключения на 25 кг на одном browser screenshot большая основная область была белой, хотя thumbnail с тем же изображением отображался. Причина ещё не установлена: это может быть состояние загрузки Next Image либо отдельный дефект main image. Следующий исполнитель обязан сначала воспроизвести и проверить `currentSrc`, `naturalWidth`, error/loading state большой картинки, а уже затем менять код. Не считать этот пункт закрытым только по unit tests.

### 5.13. Текущий незакоммиченный этап: поиск, категории и фильтры

После `c765d49` начата унификация поиска и каталога. Эти изменения прошли тесты, typecheck, lint и build, но намеренно не закоммичены перед срочной передачей.

Изменённые/новые пути:

```text
M  app/[locale]/search/page.tsx
M  components/catalog/CatalogListing.tsx
D  components/catalog/CategorySidebar.tsx
M  components/catalog/FilterSidebar.tsx
M  messages/en.json
M  messages/ru.json
M  messages/uz.json
?? lib/catalog/productSearch.ts
?? tests/catalog/productSearch.test.ts
```

Содержание этапа:

- `/[locale]/search` больше не содержит вторую урезанную реализацию карточной сетки, а использует общий `CatalogListing`;
- поиск работает по SKU, бренду, RU/UZ/EN title и description, без учёта регистра;
- добавлены 3 unit tests поиска;
- категории вынесены в компактный горизонтальный `CategoryRail` на всех размерах экрана;
- удалён больше не используемый дублирующий `CategorySidebar`;
- левая колонка отвечает только за компактные фильтры;
- группы атрибутов свёрнуты по умолчанию и автоматически раскрываются при выбранных значениях;
- динамические опции получили настоящие native checkbox inputs, клавиатурную доступность и увеличенные target sizes;
- новый текст вынесен в namespaces `catalogListing` и `catalogFilters` для RU/UZ/EN;
- заголовок поискового запроса больше не обрезается;
- RU/UZ/EN проверены в локальном браузере, включая результат для `Салфетки`, `salfetka`, `napkins`.

Перед commit этого этапа нужно повторно осмотреть desktop и mobile, отдельно проверить empty search, filters with long labels и main-image проблему галереи. Затем создать один тематический commit, не включая handoff.

## 6. Последний зелёный baseline

Финально перед созданием transfer ZIP на текущем файловом snapshot выполнены:

```text
npm test             PASS — 20 test files, 129 passed
npm run typecheck    PASS
npm run lint         PASS
npm run build        PASS — 70 static pages
git diff --check     PASS
```

Build детерминированно менял `next-env.d.ts` с dev imports на build imports. Diff был проверен, после чего только это generated-изменение возвращено к чистому HEAD. Продуктовый код для маскировки baseline не изменялся.

Локальная визуальная проверка в браузере подтверждала:

- страницу товара на узбекском;
- страницу товара на английском;
- локализованные title, price label, quantity unit и product type;
- локализованные связанные товары;
- локализованный placeholder;
- работу витрины с реальным Firestore после настройки ADC.
- современный публичный A4 PDF flow на английском;
- единый search/catalog layout на русском, узбекском и английском;
- стабильное количество thumbnails для вариантов Svalya.

Остаётся визуально перепроверить большую картинку после переключения варианта Svalya: см. раздел 5.12.

## 7. Полный список локальных commits после исходного Mac handoff baseline

```text
a7aaa3c fix(catalog): expose only published products publicly
56aff84 fix(catalog): fail honestly when public data is unavailable
11524b0 fix(auth): prepare admin document authorization
7b14d0b fix(bag-designer): bound generation cost and draft lifecycle
32eb5c9 fix(commerce): align offer and quantity rules
995a20f fix(i18n): render locale from the route
c30e4b8 fix(i18n): make content fallback explicit
20af10a fix(ui): restore semantic focus and theme tokens
4cff065 refactor(theme): remove store branding from provider
ced83d8 refactor(data): use neutral repository names
51b74a9 refactor(ui): remove unused legacy css aliases
ce3bac7 refactor(ui): theme informational page cards
5ffcfe9 refactor(ui): unify retry error states
152808a refactor(ui): reuse semantic notice states
1464861 fix(ui): respect safe areas in mobile overlays
adbf2c3 refactor(auth): remove unused anonymous customer client
fe6dc17 docs: record cleanup boundaries
0616c09 test(theme): cover modes and radius bounds
25e418a refactor(runtime): remove store brand fallbacks
a172923 refactor(pdf): derive catalog identity from settings
29f6e81 refactor(documents): remove transient store defaults
34f8ca7 refactor(content): derive storefront brand mentions
69185f7 refactor(ui): remove embedded storefront identifiers
07e537b refactor(branding): use a configurable logo component
d020013 fix(admin): validate partner records
f8730bc docs: update cleanup compatibility boundaries
14d4a70 fix(pdf): apply configured document theme
29e9b84 fix(theme): remove residual runtime color overrides
caee5c0 fix(theme): preserve contrast for custom brand colors
1b46994 refactor(ui): finish shared alert states
39053cc fix(catalog): preflight credentialless builds before cache
29e85f1 fix(admin): validate attribute mutations
32f9137 fix(admin): surface partner mutation failures
1aedced fix(admin): surface catalog deletion failures
a5d11e3 fix(orders): preserve zero monetary amounts
2246a59 fix(admin): align attribute definition types
1b14ad8 fix(admin): preserve typed product attributes
6551233 fix(types): align variant availability values
6b667c5 fix(admin): validate complete product records
d751a6d fix(admin): align banner form validation
f6d57b9 fix(api): reject malformed mutation bodies
c2cbce0 fix(api): hide order infrastructure errors
3b750da fix(api): hide unknown Gemini errors
4f46941 docs: record attribute enforcement boundary
1d5c023 feat(catalog): restore seed product imagery
e9f4b15 fix(catalog): localize product data across storefront
02d1f98 fix(catalog): unify public and admin PDF flow
c765d49 fix(catalog): stabilize variant image gallery
```

## 8. Project-local skills

`.agents/skills` включён в ZIP. `skills-lock.json` также включён. На исходном Mac доступны следующие `SKILL.md`:

```text
accessibility
apple-design
better-accessibility
better-colors
better-interface
better-layout
better-typography
better-ui
better-writing
bun
composition-patterns
frontend-design
grill-me
impeccable
next-best-practices
next-cache-components
next-upgrade
playwright
react-best-practices
react-hook-form
security-best-practices
security-threat-model
seo
tailwind-css-patterns
typescript-advanced-types
ui-ux-pro-max
vercel-react-best-practices
web-design-guidelines
zod
```

Project-local skills являются источником инструкций этого репозитория. Не нужно устанавливать их глобально. Перед конкретной задачей следует полностью читать только применимые `SKILL.md`.

Важно: skill `bun` находится в репозитории как справочный project skill, но package manager проекта — npm. Без отдельного решения не переходить на Bun.

## 9. Что не включено в ZIP

Исключения сделаны намеренно:

- `.env.local` — содержит секреты и никогда не должен попадать в архив или Git;
- `.git/` — вместо него прилагается актуальный Git bundle;
- `node_modules/` — восстанавливается через `npm ci`;
- `.next/` и `.next/node_modules/` — результаты dev/build;
- `coverage/`, `dist/`, `.cache/`, `.turbo/`;
- `*.log`, npm/yarn debug logs;
- `.DS_Store` и прочий macOS metadata;
- `tsconfig.tsbuildinfo` — TypeScript cache;
- `.playwright-cli/`, `test-results/`, `playwright-report/` — временные browser artifacts;
- готовый ZIP не вкладывается сам в себя.

В ZIP включены `public/`, `scratch/`, `.agents/skills/`, `skills-lock.json`, конфигурация Firebase/App Hosting, миграционные скрипты, tests, package-lock и все обычные исходники проекта. В корне архива также находятся актуальный Git bundle, patch незакоммиченного UX-этапа и этот handoff.

## 10. Environment и секреты

`.env.local` на исходном Mac:

- существует;
- является обычным локальным файлом, не symlink;
- игнорируется Git;
- не находится в Git index;
- permissions: `600`;
- не включён в ZIP.

Имена переменных, присутствовавших локально; значения намеренно не приводятся:

```text
GEMINI_SETTINGS_SCOPE
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
TELEGRAM_CONFIG_ENCRYPTION_KEY
```

Имена из `.env.example`, которые могут понадобиться в зависимости от режима:

```text
ADMIN_EMAILS
NEXT_PUBLIC_CATALOG_PDF_URL
NEXT_PUBLIC_SITE_URL
SANPACK_ENFORCE_ADMIN_DOCUMENTS
SANPACK_USE_SEED_DATA
```

На новом компьютере `.env.local` нужно перенести отдельно безопасным каналом и выполнить:

```bash
chmod 600 .env.local
git check-ignore -v .env.local
git ls-files --error-unmatch .env.local
```

Последняя команда должна завершиться ненулевым кодом. Никогда не печатать значения `.env.local` в чат, терминальный отчёт или commit.

Для реального Firestore/Gemini локально использовались:

```text
GEMINI_SETTINGS_SCOPE=production
TELEGRAM_CONFIG_ENCRYPTION_KEY=<получить безопасно, не копировать в документацию>
```

## 11. Восстановление на другом Mac

### Рекомендуемый вариант: восстановить Git history из bundle

1. Распаковать ZIP в отдельную папку.
2. Найти приложенный файл `SANPACK_CURRENT_c765d49_2026-08-23.bundle`.
3. Проверить bundle и клонировать:

```bash
git bundle verify SANPACK_CURRENT_c765d49_2026-08-23.bundle
git clone SANPACK_CURRENT_c765d49_2026-08-23.bundle SANPACK
cd SANPACK
git switch main
git rev-parse HEAD
```

Ожидаемый HEAD:

```text
c765d494c5229faa256a2c58b7dc7fe573ef5a85
```

4. Настроить GitHub remote:

```bash
git remote rename origin transfer-bundle
git remote add origin https://github.com/Radionziga/sanpack.git
git fetch origin --prune
git rev-list --left-right --count origin/main...main
```

Ожидаемый результат до push: `0 51`.

5. Восстановить незакоммиченный UX-этап одним из двух способов:

- самый простой и надёжный: использовать папку `SANPACK/` из ZIP как текущий файловый snapshot;
- если работа продолжается из чистого bundle clone, применить приложенный `SANPACK_UNCOMMITTED_c765d49_2026-08-23.patch`:

```bash
git apply --index --intent-to-add ../SANPACK_UNCOMMITTED_c765d49_2026-08-23.patch
git reset
git status --short
```

После применения должны появиться именно пути из раздела 5.13. Handoff-файл в patch не входит.

6. Перенести `.env.local` отдельно и выставить permissions `600`.
7. Проверить Node.js 24 и npm.
8. Установить зависимости строго из lockfile:

```bash
npm ci
```

9. Проверить нативный Sharp:

```bash
node -e "require('sharp'); console.log('sharp ok')"
```

10. Для реального Firestore установить Google Cloud CLI только если он ещё отсутствует, затем авторизоваться интерактивно:

```bash
gcloud auth login --update-adc
gcloud config set project stamply-4df8a
gcloud auth application-default set-quota-project stamply-4df8a
```

Не переносить ADC-файлы между компьютерами. На новом Mac выполнить новый login владельца.

11. Запустить baseline:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short
```

12. Запустить локально:

```bash
npm run dev
```

Открыть `http://localhost:3000`.

### Альтернативный вариант: использовать snapshot исходников

Папка `SANPACK/` внутри ZIP уже содержит полный рабочий snapshot без `.git`. Её можно использовать напрямую:

```bash
cd SANPACK
npm ci
npm run dev
```

Для нормальной дальнейшей Git-работы всё равно рекомендуется вариант с bundle.

## 12. Firebase и production safety

Конфигурационные файлы в проекте:

- `.firebaserc`;
- `firebase.json`;
- `firestore.rules`;
- `apphosting.yaml`.

Firebase CLI доступен как локальная dependency через `npx firebase`.

На новом компьютере без отдельного явного разрешения владельца запрещено:

- deploy;
- Firestore writes/deletes;
- Storage writes/deletes;
- Firebase Auth changes;
- Secret Manager changes;
- Telegram settings/webhooks;
- массовые Gemini generation;
- push в GitHub.

Application Default Credentials нужны только для локальных задач, использующих production Admin SDK. Их отсутствие не является поломкой обычного исходного архива.

## 13. Открытые вопросы и оставшаяся работа

Полная долгосрочная программа ещё не объявлена завершённой. Следующему исполнителю нужно не переписывать проект, а продолжить проверяемыми этапами.

Приоритетные открытые вопросы:

1. Не потерять незакоммиченный search/catalog/filter этап из раздела 5.13; завершить visual QA и оформить отдельным commit.
2. Диагностировать белую main-image область галереи Svalya после переключения на вариант 25 кг; не менять код без воспроизведения и DOM/network evidence.
3. Довести namespace-based i18n: в проекте ещё остаются legacy `lib/i18n/translations.ts`, `LanguageContext` и `pageCopy` на части публичных страниц. Нельзя заявлять, что вся локализация унифицирована, пока usages не проаудированы.
4. Проверить единый современный PDF flow на RU и UZ, mobile и keyboard; EN desktop уже проверен.
5. Устранить Next Image dev warnings: promo banners передают `quality={90}`, а `next.config.ts` разрешает только `[75, 86, 88]`. Сначала решить, добавить ли `90` в конфиг или привести баннеры к утверждённому качеству; также проверить LCP warning основной product image и обоснованность eager/preload.
6. Подтвердить production `admins/{uid}` владельца перед включением строгого admin enforcement.
7. Согласовать бизнес-семантику tier pricing и затем унифицировать расчёт на странице, в cart, server snapshots, Telegram и PDF.
8. Выбрать распределённый rate limit и scheduler для Bag Designer; process-local Map недостаточен для нескольких инстансов.
9. Провести полный UI/UX QA: desktop/tablet/mobile, light/dark, radius 0/medium/max, keyboard и accessibility.
10. Отдельно проверить Telegram Mini App и реальные Telegram flows.
11. Улучшить качество товарных фотографий при наличии исходников высокого разрешения.
12. Классифицировать оставшиеся cleanup/dead-code кандидаты перед удалением.
13. Проверить и актуализировать README только после подтверждения реализованного поведения.
14. Выполнить финальную API smoke-матрицу и human states: loading/empty/error/success.
15. Решить, когда и кем 51 локальный commit будет просмотрен и отправлен в GitHub. Push автоматически не делать.

Известное историческое наблюдение: один characterization `todo` фиксировал различие общего `isValidOrderQuantity` и server maximum enforcement. Перед дальнейшим изменением нужно проверить актуальный тестовый набор и текущую реализацию — аудит является картой, а не абсолютной истиной.

## 14. Правила для следующего Codex-чата

Перед изменением кода:

1. Полностью прочитать `AGENTS.md` и `CLAUDE.md`.
2. Проверить `git status --short`, `git log -5 --oneline`, `git diff`, `git diff --cached`.
3. Убедиться, что HEAD равен `c765d494c5229faa256a2c58b7dc7fe573ef5a85` или является осознанным более новым commit.
4. Прочитать полностью только применимые project-local `SKILL.md`.
5. Для Next.js 16.3 перед изменением Next-механизмов читать соответствующую документацию в `node_modules/next/dist/docs/`.
6. Не менять `.env.local`, не печатать секреты и не добавлять их в Git.
7. Не выполнять destructive Git operations.
8. Не выполнять `npm update`, `npm audit fix` или замену package manager.
9. Не делать production mutation, push или deployment без отдельной команды владельца.
10. Перед исправлением перепроверять проблему по коду, типам, Zod, repository, routes и tests.

После связного изменения:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short
```

Если build меняет только `next-env.d.ts`, сначала показать и проверить точный diff. Возвращать файл к HEAD допустимо только если доказано, что изменение чисто generated и детерминировано.

## 15. Что означает Goal Stalled

`Goal Stalled` относится к долговременной цели Codex, а не к ошибке Next.js, Firebase или сайта. Обычные задачи могут быть выполнены даже при таком badge.

Для продолжения старой цели в Codex используется:

```text
/goal resume
```

Если старая цель больше не нужна:

```text
/goal clear
```

## 16. Финальные подтверждения этой передачи

- Исходники, конфигурация, assets, tests, scripts и project-local skills подготовлены к переносу.
- `node_modules`, `.next`, кэши и временные build artifacts исключены.
- `.env.local` и секреты исключены.
- Старый `sanpack.bundle` не удалён и не перезаписан.
- Для архива создаётся отдельный актуальный Git bundle.
- В архив включены защищённые permissions-ограниченные backup/review файлы миграции; их нельзя публиковать или добавлять в Git.
- Production Firestore в этой сессии изменялся только в явно разрешённой миграции переводов 164 товаров.
- Цены, SKU, slug, изображения и прочие защищённые товарные поля миграцией не изменялись.
- Push не выполнялся.
- Deployment не выполнялся.
- Последние продуктовые commits перед архивом: `02d1f98` и `c765d49`.
- Специально ради подготовки ZIP новые commits не создавались.
- Незакоммиченный search/catalog/filter этап сохранён в файловом snapshot и отдельном patch-файле; он не замаскирован и подробно описан выше.

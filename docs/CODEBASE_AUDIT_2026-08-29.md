# SANPACK — codebase audit and controlled cleanup

Дата: 2026-08-29
Checkpoint до аудита: `b20cf52 checkpoint: align catalog admin with storefront`

## Scope и метод

Проверены App Router, server/client boundaries, repositories и Firestore REST, публичные и административные API, Zod-контракты, каталог и поиск, локализация RU/UZ/EN/ZH, тема, Tailwind utilities, Firebase Auth/Firestore/Storage, Telegram, bag designer, PDF, CI, Vitest, Playwright/axe, зависимости и документация.

Работа шла в порядке `инвентаризация → P0–P3 → только доказанно безопасные изменения → регрессия`. Механическое дробление больших файлов и косметическая перестройка рабочего кода не выполнялись.

## Карта критических потоков

| Feature | Source / implementation | Контракт и admin control | Состояние |
| --- | --- | --- | --- |
| Публичные товары | `serverCatalogRepository` → Firestore REST → `filterPublicProducts` | `Product`, `productMutationSchema`, `/api/admin/data` | Исправлена защита runtime-контракта опубликованного товара |
| Категории и группы | Firestore `categories.parentId` | Categories admin + mutation validation | Рабочая двухуровневая CMS-модель; hierarchy helpers ещё дублируются |
| Атрибуты | Firestore `attributes.categoryIds` | Attributes admin + product editor | Рабочая category-aware модель; legacy `Category.attributeIds` сохранён для совместимости |
| Поиск | полный публичный Product snapshot | Header и Mobile chrome | Объединена каноническая реализация и ранжирование четырёх локалей |
| Public API cache | inner `fetch` + outer `unstable_cache` | `revalidateTag` после admin mutation | Теги выровнены; удалён второй stale HTTP-слой API |
| Sitemap | live public repository | только опубликованные записи | При ошибке live-data теперь возвращает static routes, а не подменяет каталог seed-данными |
| Тема | Firestore settings → `StorefrontTheme` → CSS variables | `/admin/settings` | Primary, secondary, fonts и radius распространяются на storefront и admin |
| Checkout | `/api/requests` → server-side price rebuild → Firestore | request UI + admin orders | Клиентская сумма не доверенная; distributed rate limit включён |
| Telegram return | localized internal path | Telegram auth start | Исправлена поддержка ZH; внешние/open-redirect пути отклоняются |

## Приоритеты

### P0 — исправлено

1. **Опубликованный Firestore Product мог быть структурно неполным.** Mutation schema намеренно допускает неполные drafts, но admin save заменяет документ целиком. Public reader раньше проверял только `status` и затем без защиты использовал `images.map`, `variants` и другие поля. Теперь:
   - публикация отклоняется, если отсутствуют обязательные runtime-поля;
   - публичный reader fail-closed отбрасывает повреждённый published document;
   - draft/hidden/archive совместимость сохранена;
   - добавлен regression test.

2. **Инвалидация кэша не доходила до внутреннего Firestore fetch.** Outer cache имел tags, inner `fetch` — только TTL, а `/api/catalog` добавлял ещё один stale HTTP cache. Теперь tags присутствуют на внутреннем read, API не создаёт независимый stale слой, а admin `revalidateTag(..., { expire: 0 })` имеет один понятный путь.

### P1 — исправлено или локализовано

1. **Desktop и mobile использовали разные поисковые реализации.** Общий `searchAndRankProducts` ищет по всем локалям, SKU, brand и description и одинаково ранжирует локализованный prefix.
2. **Telegram auth return path не принимал `/zh`.** Исправлено общим sanitizer с тестами allowed/blocked URL.
3. **Axe скрывал `color-contrast`.** Suppression удалён. Аудит обнаружил повторяющийся дефект `--sp-ink-muted`/`--sp-ink-tertiary`; токены приведены к WCAG AA на canvas/surface/inset. Проверка ключевых desktop/mobile страниц зелёная.
4. **Sitemap молча подменял недоступный live-каталог bundled seed.** Теперь деградация честная: статические страницы остаются, динамические URL временно отсутствуют.
5. **README и bag-designer operations описывали старые три локали и process-local limiter.** Документация синхронизирована с четырьмя локалями и Firestore transaction limiter.

### P1 — осознанно оставлено для отдельного refactor

1. `app/[locale]/product/[productSlug]/page.tsx` — 859 строк и широкая client boundary. Страница повторно загружает полный каталог после hydration, хотя server layout уже знает товар. Рекомендуемый seam: server Product Detail implementation + маленькие client islands для галереи, количества, избранного и корзины.
2. Group/category/descendant/order logic повторяется в storefront, PDF, admin и migration. Рекомендуемый глубокий `catalogTaxonomy` module вместо новых shallow wrappers.
3. Filter/facet/sort pipeline частично находится внутри `CatalogListing`. Рекомендуется pure Catalog Query module, используемый listing, mobile и тестами.
4. Seed Chinese compatibility (`withSeedChineseLocalization` и banner fallback) всё ещё дополняет отдельные старые live documents по SKU/id. Это временный adapter, а не целевая CMS-модель. Удалять его безопасно только после dry-run аудита и миграции всех ZH полей в Firestore.

### P2 — долг и эксплуатационные prerequisites

1. `Product.availability`/`ProductVariant.availability` и `stockStatus` — две пересекающиеся модели. Storefront фактически использует `stockStatus`, admin variant editor всё ещё показывает availability. Нужна отдельная совместимая data migration; поле не удалено вслепую.
2. `Category.attributeIds` — legacy reverse relation; canonical relation находится в `Attribute.categoryIds`. Поле сохранено для backward compatibility, новые функции должны использовать canonical direction.
3. Крупные modules: Product editor 1197, PDF document 902, Media admin 832, Request page 801. Размер сам по себе не является дефектом. Product editor стоит делить по бизнес-секциям с единым form state; PDF renderer пока изолирован и имеет низкий leverage для переписывания.
4. Firestore public rules для draft/inactive документов остаются осознанно принятым риском владельца до миграции публичной проекции и emulator tests.
5. CSP и HSTS не заданы приложением. HSTS должен включаться на подтверждённом HTTPS edge; CSP требует report-only этапа и инвентаризации Next/Firebase/Telegram/Gemini origins. Существующие `nosniff`, frame, referrer и permissions headers сохранены.
6. Для `rateLimits.expiresAt` требуется production TTL policy. Correctness лимита от TTL не зависит; TTL очищает старые buckets.

### P3 — cleanup

Удалены только модули с нулём repository references:

- шесть старых home sections: `Advantages`, `BrandingBanner`, `BusinessSegments`, `CtaBanner`, `FastCategories`, `HeroBanner`;
- старый `MegaMenu`;
- неиспользуемый `hooks/use-mobile.ts`;
- неиспользуемый `lib/utils.ts`;
- несовместимый и неиспользуемый `RequestStatus` alias.

После проверки imports удалены неиспользуемые packages: `class-variance-authority`, `clsx`, `tailwind-merge`, `@tailwindcss/typography`, `tw-animate-css`. Operational scripts и `productImageNormalization` не удалялись: отсутствие runtime import не доказывает отсутствие ручного operational use.

## Design system и тема

`StorefrontTheme` используется и в locale layout, и в admin layout. Tailwind 4 classes `rounded-md/lg/xl/2xl` разрешаются через переопределённые `--radius-*`, поэтому настройка radius действительно охватывает legacy admin utilities без массового переписывания className. Shared admin primitives (`admin-control`, `admin-panel`, buttons, modals) также используют semantic radius tokens.

Primary/secondary colors, font pair, surfaces, ink, controls и focus используют semantic `--sp-*`. Compatibility bridge для старых literal green/light classes остаётся временным adapter. Domain colors в PDF document, technical bag preview, flags и status semantics не должны автоматически превращаться в brand primary.

Визуальный архитектурный отчёт создан во временном файле `/tmp/sanpack-codebase-architecture-audit-2026-08-29.html` и открыт локально. Он не добавлен в Git.

## Архитектурная рекомендация

Лучший следующий refactor — **Public Catalog Read**. Это должен быть глубокий module с маленьким interface и скрытой implementation для Firestore transport, runtime contract, cache policy, localization/media adapters и seed-mode. Такой seam даёт высокий leverage и повышает locality. API route остаётся тонким adapter.

Следом: **Product Detail** и **Catalog Taxonomy**. Product Editor стоит реорганизовать только после закрепления domain contracts; случайные shallow components увеличат depth и не улучшат locality.

## Security review

| Rule | Результат |
| --- | --- |
| SEC-NEXT-AUTH-01 redirects | Internal localized sanitizer; ZH исправлен; external/protocol-relative paths заблокированы тестами |
| SEC-NEXT-API-01 auth + input | Admin mutations требуют session/role и Zod; public requests пересчитывают цены server-side |
| SEC-NEXT-CACHE-01 invalidation | Внутренние cache tags выровнены с admin invalidation |
| SEC-FIRESTORE-01 least public data | Draft/inactive public rules — known accepted risk, не замаскирован |
| SEC-NEXT-HEADERS-01 browser hardening | Базовые headers есть; staged CSP и production HSTS остаются prerequisite |
| SEC-RATE-01 abuse control | Cross-instance Firestore transaction limiter; raw IP не хранится; TTL требуется для cleanup |

`npm audit` на дату аудита: 13 transitive/direct-chain issues (11 moderate, 2 high, 0 critical). Предлагаемые automatic fixes включают несовместимые/downgrade paths для Firebase toolchain, поэтому versions автоматически не менялись и `npm audit fix` не запускался.

## Verification

- Targeted Vitest: 23/23 passed.
- Full Vitest: 25 files, 156/156 passed.
- TypeScript: passed.
- ESLint: passed.
- Next.js 16.3 production build: passed; 89 pages generated in RU/UZ/EN/ZH seed baseline.
- Playwright: 16/16 passed on desktop Chromium and iPhone 13 emulation.
- Axe без suppression: home, catalog, product, bag designer и 404 passed на desktop/mobile.
- `git diff --check`: passed.

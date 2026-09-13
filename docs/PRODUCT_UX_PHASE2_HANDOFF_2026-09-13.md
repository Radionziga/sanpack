# SANPACK Product UX Phase 2 handoff — 2026-09-13

## Outcome

Phase 2 ускоряет повторную B2B-закупку без изменения pricing, Product/Variant schema authority или request workflow. Catalog быстрее показывает товары, Search сохраняет контекст, а Customer History восстанавливает прошлый состав только после сверки с текущим каталогом.

## U06 / U09 — Catalog

- Большая Home-подобная category showcase удалена из `/catalog`; на mobile остаётся компактная горизонтальная category rail, внутри Category — Subcategory chips.
- Initial Product render ограничен 24 карточками. `Показать ещё` раскрывает следующую порцию; номер раскрытой страницы синхронизирован с query string вместе с sort/filter/view state.
- До изменений production `/ru/catalog` отдавал около 1.61 MB raw HTML и 238 `<article>`; local seed — около 1.38 MB и 164 карточки. После изменений browser regression подтверждает 24 карточки initial render и более раннюю первую карточку. Это не CWV claim.
- Full Product collection по-прежнему приходит через trusted server boundary. Отдельный listing schema/backend search сознательно не вводились: следующий payload этап оправдан только новым измеренным ростом.

## U08 — Search

- Query — часть browser history; Product → Back возвращает прежний query/results и восстанавливает сохранённую scroll position.
- Loading, error/retry, empty и ready — разные состояния. Сетевая ошибка больше не выглядит как пустой результат.
- Product/Variant SKU, localized names, brand и category matching сохранены. Matched Variant показывается в карточке и передаётся в Product как optional `variant` query, где существующий Variant selector открывается выбранным. Canonical Product URL/SEO не меняются.

## U10 — Repeat composition

- Customer History получила действие «Повторить состав». Оно сначала читает текущий public catalog и использует существующий `reconcileCartItems`.
- Изменившиеся price/quantity/packaging показываются перед добавлением. Removed Variant, unpublished/missing Product и informational Product блокируются; request-price сохраняет текущую request semantics.
- Кнопка добавляет только актуальные строки в существующую корзину. Product+Variant merge-ится существующим cart contract; корзина не очищается, Request не создаётся и notification не отправляется.
- Новые order snapshots содержат optional customer-safe `orderRule` для сравнения packaging/minimum/step. Старые Requests читаются без migration; точное сравнение старой упаковки возможно только там, где snapshot уже существует.

## Safety

- Canonical server pricing и checkout validation не менялись.
- No automatic order, notification, production data write, taxonomy migration, rules/IAM/secret change.
- Link Hub остаётся отдельным checkpoint/deliverable.
- Локальная visual verification может явно использовать read-only production public projection через `SANPACK_PUBLIC_CATALOG_ORIGIN`. Это устраняет неполные seed media при сравнении каталога, не копирует Firebase download URLs/tokens в Git, не проксирует writes и полностью отключено production runtime.

## Regression coverage

- Unit: catalog URL pagination state; changed price/quantity; request-price; informational/removed Variant; packaging snapshot/change; customer-safe projection.
- Browser: compact/bounded Catalog, load-more URL restoration, exact Variant SKU → selected Variant, Search error/retry/empty and Product → Back scroll, repeat review/merge/no POST, 320/390 px overflow.
- Existing Phase 1, stabilization, taxonomy, auth/order and Link Hub suites remain release-gate requirements.

## Production rollout — 2026-09-13

- Link Hub checkpoint: `06af3e76395612ae0d5b8c3b8056463dab6849b9` (`feat: add configurable SANPACK link hub`).
- Product UX Phase 2 checkpoint: `6922e5a8c4f61dcf13c237d741d088c6a9404886` (`feat: improve catalog discovery and repeat requests`).
- Narrow Link Hub viewport patch: `d0a048dde44de0a8ada3fa9df414c760d5c98e67` (`fix: keep link hub language menu in viewport`).
- Ordinary `main` pushes triggered App Hosting rollouts `fah-stamply-4df8a-sanpack-rollout-2026-09-13-001` and `fah-stamply-4df8a-sanpack-rollout-2026-09-13-002`; both builds and the required GitHub quality/browser checks completed successfully. No duplicate manual deploy was run.
- The live custom domain serves the final patch behavior. Production Catalog renders 24 cards initially, 48 after `Load more`, preserves `page=2`, and exact Variant SKU search restores its query and selected Variant after Product → Back.
- Production public projection contains 238 Products and all 238 have image URLs. The previously reported missing local photos came from incomplete seed data; the development-only public mirror now renders the same read-only public projection without introducing a production fallback.
- Link Hub language-menu geometry was verified at 320/360/390/430 px: the 192 px menu opens from the left control toward the viewport and remains fully visible without horizontal overflow.
- Route smoke passed for RU/UZ/EN/ZH storefront, Catalog, Search, Request, Profile, Link Hub, robots and sitemap. Unauthenticated `/admin/links` redirects to the existing Admin login boundary.
- No Request or Telegram notification was created. Repeat composition remains a cart-only operation; authenticated production mutation smoke was intentionally not performed.
- No Firestore/Storage rules, IAM, secrets, taxonomy or production content/data were changed. Previous source `702ceb6ad35829661488cfa05e5484c9cecf98d9` / rollout `fah-stamply-4df8a-sanpack-rollout-2026-09-12-003` remains the application rollback target.

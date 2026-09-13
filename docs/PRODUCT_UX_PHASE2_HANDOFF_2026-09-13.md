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

## Deployment

Deploy only after the complete release gate. App Hosting is expected to build from an ordinary `main` push; do not perform duplicate manual deploy. No Firestore/Storage rules, IAM, secrets or data migration is required. Production Link Hub content remains controlled through existing Admin settings.

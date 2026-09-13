# SANPACK Link Hub handoff — 2026-09-13

## Outcome

Добавлена самостоятельная локализованная страница `/[locale]/links`, предназначенная для Telegram, Instagram, QR-кодов и других внешних профилей. Она использует существующую white-label identity SANPACK и не зависит от стороннего Linktree.

## Architecture

- `SiteSettings.linkHub` — optional backward-compatible configuration; migration существующих Firestore documents не требуется.
- Public settings projection содержит только явные Link Hub поля. Private/unknown nested fields не сериализуются.
- Разрешены internal paths, HTTPS, `tel:` и `mailto:`. `javascript:`, `data:`, protocol-relative и plain HTTP URLs отклоняются server validation.
- Публичная страница имеет localized metadata, canonical/hreflang и включается в sitemap только когда enabled.
- Link Hub является standalone destination: общий mobile bottom bar/cart dock и floating contact FAB на нём не рендерятся.

## Admin

`/admin/links` доступен `super_admin` через существующий `settings.write` workflow. Можно включить/скрыть страницу, редактировать RU/UZ/EN/ZH тексты и highlight, добавлять до 20 ссылок, менять порядок, иконку и видимость. Русский текст служит fallback. Логотип и город берутся из существующих Company/Contacts settings.

## Design basis

Мобильная композиция подготовлена в Sleek и затем адаптирована к SANPACK design tokens, четырём локалям, safe areas и существующим React/Next patterns. Sleek project: `XVqOuF4jtCL`. Исходные визуальные reference artifacts находятся в `docs/design/sleek-sanpack-link-hub/`.

## Safety and validation

- Local checkpoint: `06af3e76395612ae0d5b8c3b8056463dab6849b9` (`feat: add configurable SANPACK link hub`).
- Production data, secrets, deploy и push не изменялись.
- Targeted unit tests покрывают merge/defaults, public projection, URL validation и capabilities.
- Playwright покрывает localized route, locale-preserving internal navigation, standalone chrome, 320 px overflow и critical/serious axe findings.

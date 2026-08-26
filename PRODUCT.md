# SANPACK Storefront — Product Context

## What this product is

SANPACK Storefront is a multilingual B2B catalog and request-ordering experience for customers in Uzbekistan. It combines SANPACK packaging products, food distribution, printing and branding services, and a package-constructor module in one public storefront.

The catalog is the main entry point. Customers browse categories and products, add items to a familiar cart, provide a contact person, phone, delivery address, delivery date, and optional comment, then send a request. Prices and totals are preliminary until a manager confirms availability and delivery terms.

## Who it serves

- Procurement staff, shop and hospitality operators, and other business buyers.
- Customers browsing on desktop web, mobile web, or Telegram Mini App.
- Russian-, Uzbek-, and English-speaking users in and around Tashkent.
- SANPACK staff who manage products, translations, images, prices, and request processing through the existing admin and backend flows.

## Core jobs

1. Find the right product quickly by category, search, sorting, and relevant filters.
2. Understand the product, unit of sale, minimum order, availability terms, and preliminary price.
3. Build a cart without ambiguity and send a delivery request with minimal form effort.
4. Reach SANPACK services such as printing/branding and the package constructor without letting those modules overload the shopping flow.

## Product and data commitments

- Firestore and the existing repository/API abstractions remain the source of truth for products, categories, localized fields, prices, images, and statuses.
- The existing cart/request contracts and Telegram notification path must remain compatible unless a separate backend task explicitly changes them.
- The public UI does not write production catalog data.
- Product and interface copy must work in Russian, Uzbek, and English without exposing translation keys or silently presenting Russian as a finished translation.
- “Корзина / Cart / Savat” is used for the familiar shopping interaction. The final business action remains “Отправить заявку”, and totals remain preliminary.

## Experience direction

- Quality bar: at least the usability and visual coherence of Yandex Lavka, used as a direction reference rather than copied screen-for-screen.
- Visual language: clean, bright, content-first, familiar marketplace patterns, generous but efficient spacing, little card chrome, and functional shadows only.
- Brand: official SANPACK logo, existing green palette, and Manrope for interface typography. The extended brand typeface is reserved for the logo and branded materials.
- Product imagery: real product photography when available; clean white backgrounds, contained objects, no visible rectangular seams, and localized honest empty states when photography is absent.
- Responsive strategy: one design language across desktop, mobile web, and Telegram Mini App; layouts adapt rather than becoming separate products.

## Navigation decisions

- The home page already begins with the catalog, so desktop header links for “Главная” and “Каталог” are unnecessary.
- “О компании”, “Доставка”, and “Контакты” remain available in the footer, not in the main header.
- “Клиенты и партнёры” belongs inside “О компании”.
- Printing/branding and the package constructor are modular services reached from the catalog/service navigation.

## Accessibility and quality bar

- Practical WCAG 2.2 AA target: keyboard access, visible focus, meaningful labels, adequate contrast, and reduced-motion support.
- Interactive targets are at least 44×44 px.
- Layouts must reflow without horizontal overflow at 320 px and remain usable at 200% zoom.
- Responsive QA viewports: 375×812, 390×844, 844×390, and 1440×900.

## Open business decisions

- Exact delivery-price calculation and production scheduling rules are not defined by this visual redesign.
- Optional company fields such as tax ID may remain available, but must not block the short customer request flow.

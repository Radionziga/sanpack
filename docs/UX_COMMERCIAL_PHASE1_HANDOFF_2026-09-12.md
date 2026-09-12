# SANPACK UX / Commercial Flow Phase 1 — handoff

Date: 2026-09-12

## Scope

Implemented the accepted Product Audit package U01/U02/U03/U04/U05/U07/U11/U12 without changing catalog, pricing, order, identity, Firebase, or taxonomy architecture. SANPACK remains a B2B procurement request portal: submitting a request does not charge the customer and a manager confirms final price, availability, and delivery.

## Implemented

- One shared commercial-summary contract for all-priced, mixed, and request-only carts. Mixed carts show the subtotal of priced lines plus the number of request-price lines; request-only carts never show zero.
- Product CTA commercial block now exposes sales unit, selected Variant, package composition, minimum purchase amount, quantity, wholesale thresholds, availability, and add action together.
- Reusable numeric quantity control preserves existing minimum, step, maximum, package, and Variant normalization. Plus/minus remains available and accessible labels include Product/Variant context.
- Request page prioritizes composition and current line totals, then commercial summary and the contact/delivery form. Success and explanatory copy consistently use request terminology.
- Storefront search covers Product SKU, Variant SKU, localized Product/Variant names, brand, and localized Category names. A Variant match is labelled; it is not auto-selected on the destination Product page.
- Mobile bottom navigation exposes immediate pending feedback and Catalog has a route loading skeleton.
- Mini App Profile/History hide logout and explain that the active account follows Telegram; browser logout remains available.
- Narrow header, cart dock, commercial copy, safe-area spacing, and fixed panels were checked at 320/360/390/430 px.

## Compatibility

No persistent schema fields, Firestore migrations, Storage changes, pricing semantics, order payload changes, production content writes, or taxonomy mapping are required. Existing cart records without a Product snapshot keep their legacy fallback behavior.

## Regression coverage

- Unit: priced/mixed/request-only summaries, canonical line totals, locale presentation, package minimum amount, Variant overrides, wholesale threshold, request-price no-zero behavior, Product/Variant SKU and localized search.
- Browser: mixed request page hierarchy and summary, manual package quantity normalization, exact Variant SKU result, Mini App/browser logout distinction, narrow mobile geometry, and immediate bottom-navigation pending feedback.
- Existing default, stabilization, taxonomy, auth/security/emulator suites remain the release gate.

## Deferred by product scope

- U06 catalog navigation redesign.
- U08 broader Search/Back architecture.
- U09 catalog pagination/payload performance refactor.
- U10 reorder/repeat request.
- Attribute-value search and automatic selection of the matched Variant.

## Production safety

Implementation itself does not require data migration or production mutation. Deployment must use the normal checkpoint → push → automatic App Hosting rollout path and read-only production smoke; no real request or Telegram order notification is required.

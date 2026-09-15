# SANPACK external analytics & search integrations — 2026-09-14

## Status

Implementation checkpoint prepared for controlled rollout. GA4 is owned by `hello@clarityext.com`. Google Search Console and Yandex account-bound setup remain owner-gated external steps.

## Baseline

- Starting local HEAD: `8d9b6779646036e00f263dc61cdcfac4072b1f0f`.
- Starting `origin/main` / production source: `dcd1c8a5cb7093b7ca7363f20c46aed3e8a11681`.
- Starting production revision: `sanpack-build-2026-09-14-001`, healthy at 100% traffic.
- No taxonomy, catalog content, price, customer, order, Firestore/Storage rule, IAM or secret change belongs to this release.

## Google Analytics 4

- Property: **stamply-4df8a** (`514533266`); web stream: **Sanpack** (`15319853813`).
- Owner account: `hello@clarityext.com`.
- Measurement ID: `G-ZXR9E6443E` (public configuration, not a secret).
- Enhanced Measurement is off. The application sends explicit SPA page views with `send_page_view: false` to prevent duplicates.
- Advertising signals and ad personalization signals are disabled in the application configuration.
- A confirmed Request response maps to GA4 `generate_lead`; SANPACK never emits `purchase` because it is a B2B request portal without online payment.

## Yandex Metrica

- Runtime support and Admin configuration are implemented, but no counter is invented or enabled without the owner account.
- Explicit SPA hits and goals are used. Webvisor/session replay, clickmap, automatic link tracking, ecommerce and form-content capture are disabled in code.

## Event mapping

| First-party event | GA4 | Yandex Metrica |
| --- | --- | --- |
| `page_view` | `page_view` | `hit` |
| `catalog_view` | `catalog_view` | `catalog_view` goal |
| `product_view` | `view_item` | `product_view` goal |
| `search` | `site_search` without query text | `site_search` goal without query text |
| `add_to_cart` / `remove_from_cart` | same recommended names | same goals |
| `cart_view` | `view_cart` | `cart_view` goal |
| `request_start` | `request_start` | `request_start` goal |
| `repeat_composition` | `repeat_composition` | same goal |
| `link_hub_click` | `link_hub_click` without destination URL | same goal |
| `contact_click` | `contact_click` | same goal |
| server-confirmed Request result | `generate_lead` | `request_created` goal |

First-party `request_created` remains the canonical server-confirmed, Request-ID-deduplicated conversion. External delivery is best-effort after the accepted server receipt and cannot change Request success. Session storage suppresses immediate external replay of the same receipt.

## Privacy and performance contract

- No name, phone, email, Telegram ID, customer UID, address, comment, auth token/cookie or Request payload is sent by the bridge.
- Free-form search text and arbitrary Link Hub destinations are not forwarded.
- Existing anonymous provider/browser identifiers are never joined to SANPACK customer identity.
- The existing privacy opt-out covers first-party and external analytics. Its HttpOnly cookie is read by the server layout, including opt-outs created before this release; DNT/GPC are also honored.
- Scripts load after interaction only on the canonical production host and never in local development or WebDriver tests. Provider failure is swallowed and cannot block the storefront.

## Search integrations and technical SEO

- Google Search Console was opened under `hello@clarityext.com` and requested a dedicated scoped DNS TXT record for that owner. The existing verification record for another Google account was left intact; the Hello Clarity record still needs to be added after owner reauthentication to Cloud DNS.
- `https://sanpack.uz/sitemap.xml` is ready to submit after ownership is confirmed. A prior submission under another Google account is not treated as completion for the owner account.
- Production `robots.txt` is HTTP 200, advertises the canonical sitemap and excludes Admin/API/private utility routes.
- Sample Home/Catalog checks confirm canonical URLs, RU/UZ/EN/ZH plus x-default alternates, and Organization/WebSite structured data. Product/Breadcrumb structured-data regressions remain in the release suite.
- Yandex Webmaster site verification and sitemap submission are pending an authenticated owner Yandex session.

## Configuration and rollback

Public provider IDs are optional fields in existing `SiteSettings` and can be changed by an authorized settings administrator in Admin → Integrations. Validation rejects malformed IDs. GA4 defaults to the reviewed production stream; Yandex stays disabled until its real counter is supplied.

Rollback is the preceding healthy App Hosting revision. No data migration, Firestore/Storage rules deployment, index, TTL, IAM, secret or catalog rollback is required. Google/Yandex ownership records are operational configuration independent of the application revision.

## Release record

Exact ending source, App Hosting revision, traffic cutover, production smoke and monitoring evidence are recorded after automatic rollout. No real Request or Telegram notification is created for analytics smoke.

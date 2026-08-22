# Cleanup audit — 2026-08-22

This classification records the repository cleanup boundary. It is not an
instruction to delete operational data or run migration scripts.

## Used

- `app`, `components`, `context`, `lib`, `types` and the Next.js route files.
- `public` assets referenced by storefront content and seed catalog records.
- Project-local `.agents/skills` and `skills-lock.json`.
- Firebase, App Hosting, Telegram, PDF and bag-designer configuration.

## Tooling and migrations

- SANPACK-named import, image assignment and catalog consolidation scripts are
  store-specific operational tooling. Their fixed project and bucket guards are
  intentional safety checks.
- Production scripts, migration reports, backups and files under `tmp`,
  `output`, `outputs`, `artifacts`, `scratch` and `.playwright-cli` are retained.
  They require explicit owner approval before deletion.

## Compatibility

- The legacy catalog color-class bridge in `app/globals.css` remains while
  referenced storefront surfaces are migrated to semantic tokens.
- Existing local-storage keys, the customer-session cookie name, deployment
  environment names and Telegram encryption namespaces remain stable. Renaming
  them would discard compatible browser state, sessions or encrypted settings.
- The admin banner reader still recognizes the legacy `/catalog/page_1.png`
  record and presents its current replacement assets. The public reader does
  not perform this substitution, so removing it requires an explicit data
  migration decision rather than a code-only cleanup.
- `SANPACK_ENFORCE_ADMIN_DOCUMENTS=false` remains a temporary authorization
  migration mode until every production administrator has a verified
  `admins/{uid}` document.
- Legacy bag-designer drafts remain recognizable by the read-only cleanup
  inspection command.

## Removed as proven dead

- Unreferenced `--sanpack-*` CSS aliases and `.transition-sanpack`.
- The unused anonymous customer-auth client and its second Firebase browser app.
- Brand-specific names from the reusable theme and repository layers.
- Embedded store identity from reusable logo, PDF, document and storefront UI
  components. Current company names, logos and contacts now come from settings;
  current catalog and marketing content remains in config and seed data.
- The random external partner-logo default; partner records now require a
  server-validated internal asset path or full URL.

## Requires an owner decision

- Tier-pricing quantity semantics and product/variant tier precedence.
- Enabling strict production admin-document enforcement.
- A distributed bag-designer rate limiter and a cleanup scheduler.
- Mass translation of catalog content whose Uzbek or English text is still an
  explicit Russian fallback.

No production data, backup, migration artifact or operational script was
deleted during this cleanup.

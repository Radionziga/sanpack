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
- `SANPACK_ENFORCE_ADMIN_DOCUMENTS=false` remains a temporary authorization
  migration mode until every production administrator has a verified
  `admins/{uid}` document.
- Legacy bag-designer drafts remain recognizable by the read-only cleanup
  inspection command.

## Removed as proven dead

- Unreferenced `--sanpack-*` CSS aliases and `.transition-sanpack`.
- The unused anonymous customer-auth client and its second Firebase browser app.
- Brand-specific names from the reusable theme and repository layers.

## Requires an owner decision

- Tier-pricing quantity semantics and product/variant tier precedence.
- Enabling strict production admin-document enforcement.
- A distributed bag-designer rate limiter and a cleanup scheduler.
- Mass translation of catalog content whose Uzbek or English text is still an
  explicit Russian fallback.

No production data, backup, migration artifact or operational script was
deleted during this cleanup.

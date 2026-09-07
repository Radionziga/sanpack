# SANPACK stabilization verification handoff — 2026-09-08

## Status

Local code is a release candidate for **READY FOR CONTROLLED DEPLOY** after the final clean-install
gate and checkpoint commit. No production deployment, push, data write, migration, rule, IAM or
secret change was performed in this verification.

## Baseline

- Branch: `main`.
- Verified starting HEAD: `8061324493527c3c6c5358671804355deb3134`.
- Production remained on the read-only observed revision `sanpack-build-2026-09-04-002` during this work.
- The accepted F01/F02/F04/F05/F07/F08/F14/F16/F17 architecture was retained.

## Closed verification blockers

### B1 — Product mutations

The browser mutation DTO continues to omit audit fields. The API now strips all server-owned fields,
restores the trusted Product ID from the mutation envelope before strict structural validation and
uses a short transaction to preserve existing `createdAt`/`createdBy` or create them server-side for
a new Product. Client attempts to replace identity or audit metadata have no effect.

### B2 — editor focus and internal navigation

Product and Attribute dialogs run initial focus/body-lock/restore-focus setup once per opening rather
than on every draft update. Escape reads current dirty/saving state through a ref. Same-document
section/hash navigation is allowed by the dirty-navigation guard, so SEO section links do not behave
like leaving the editor.

### B3 — concurrent PDF audit

PDF generation captures the source revision and renders outside Firestore transactions. A short
transaction then reads the current order and appends the PDF audit record to the current audit trail.
Concurrent manager audit entries are preserved, and generated-document metadata records the revision
whose snapshot was rendered.

### B4 — checkout intent and safe receipts

The server resolves an existing exact idempotency intent before validating mutable Product data.
Same key, business intent and customer identity return the original receipt even if the Product later
changes or is hidden. Incompatible payload/identity returns a controlled conflict. Request creation
and intent reservation remain atomic; Telegram notification is emitted only for an actually created
request. Both initial and replay responses use the same customer projection without internal audit,
actor, notification or canonical snapshot fields.

The browser persists `{key, input}` until a definitive result. Reload retries the exact prior input;
a changed form presents explicit actions to retry the previous submission or start a new request and
never silently creates a second order.

## Other completed findings

- Mobile contact FAB is removed from the small-screen fixed-action zone while the cart dock is active.
- Capability rules now govern direct admin routes as well as navigation. Disallowed roles see an
  explanatory denied state and no editor controls; server authorization remains authoritative.
- Cart reconciliation removes lines that now require a Variant selection, became informational or
  reference a removed Variant; price and quantity rule changes continue to be reconciled.
- Stabilization Playwright cases are part of the default `test:e2e`/CI gate; taxonomy has an explicit
  companion script and CI step.

## Verification coverage

Regression coverage crosses the real boundaries that previously hid the defects:

- AdminRepository payload → admin API handler → mocked Firestore transaction → response/edit/save.
- Individual `keyboard.press()` input, section navigation, Escape dirty confirmation and focus restore.
- Controlled PDF-render/manager-write interleaving.
- Lost checkout response, Product mutation, reload replay, payload/identity mismatch and concurrent
  identical submission with a single order/notification.
- Mobile 320/390/430 pixel geometry and role-specific direct-route access.
- Cart Product→Variant, informational and deleted-Variant transitions.

## Final validation

The final source snapshot was copied to a clean non-iCloud `/tmp` workspace and validated after a
fresh `npm ci`:

- `npm ls --depth=0`: valid top-level dependency tree.
- `npm test`: 54 files, 415 tests passed.
- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`: passed.
- Default `npm run test:e2e`: 66/66 desktop/mobile tests passed; stabilization is included.
- Standalone stabilization: 38/38 passed.
- Taxonomy E2E: 79 passed, one expected mobile skip for the desktop-only navigation case.
- Firebase emulators: 26 Firestore and 7 Storage boundary checks passed.
- Production read-only smoke: health, RU home, catalog, robots and sitemap returned HTTP 200; health
  reported `sanpack-build-2026-09-04-002`.
- Secret-signature and changed-file scans found no credential/private-key material.
- `npm audit`: 15 moderate and 2 high advisories; the high findings are tooling/dev dependency
  chains. `npm audit --omit=dev`: 6 moderate, 0 high/critical. No breaking rollout-time dependency
  upgrade was attempted.

Operator Firebase/gcloud authentication had expired in the non-interactive shell. Consequently the
actual production App Hosting revision and customer-history composite-index state must be re-read
after operator login during controlled-deploy preflight; no cloud state was inferred or changed.

## Deployment preflight

Before controlled deployment, authenticate the operator and re-read the live App Hosting revision.
Verify the customer-history composite index declared in `firestore.indexes.json` is deployed and
`READY`; its presence in Git is insufficient. Reconfirm owner grant, runtime permissions, environment
and secret bindings, then retain the live revision as rollback target. This release needs no catalog
migration and no Firestore/Storage rule or data-model apply.

## Deliberately unchanged

No catalog/commerce redesign, taxonomy/content migration, Brand/collections/search project, analytics,
vetclinics cleanup, payment/inventory feature or production configuration work was included.

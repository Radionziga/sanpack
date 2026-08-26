# SANPACK Storefront — Master Design System

This file is the compact machine- and human-readable source of truth generated from the project brief and the UI/UX Pro Max review. Product decisions live in `/PRODUCT.md`; implementation detail and component rules live in `/docs/STOREFRONT_DESIGN_SYSTEM.md`. Page overrides, when present, live in `pages/` and override only the relevant section of this file.

## Direction

- Product: multilingual B2B marketplace and request-ordering storefront.
- Quality reference: the clarity and confidence of Yandex Lavka, adapted to SANPACK rather than copied.
- Style: bright, clean, content-first, familiar, accessible, and moderately dense.
- Variance: 4/10. Motion: 3/10. Density: 5/10.
- Avoid decorative card stacks, playful gradients, hidden controls, and separate visual languages for desktop and mobile.

## Brand and tokens

- Use the existing `--sp-*` semantic tokens from `app/globals.css`; do not introduce parallel raw color systems.
- Primary action: `--sp-brand`; hover/strong state: `--sp-brand-deep`; soft selection: `--sp-brand-soft`; contrast text: `--sp-on-brand`.
- Canvas, surface, inset surface, text, line, focus, radius, and shadow roles must use their matching `--sp-*` tokens.
- Typography: Manrope for all interface text. The extended SANPACK face is reserved for the official logo and branded print material.
- Spacing follows a 4/8 px rhythm. Major section gaps are 24, 32, or 48 px depending on hierarchy.

## Shape and elevation

- Cards use `--sp-radius-card`; controls use `--sp-radius-control`; nested elements use `--sp-radius-control-inner`.
- Child content is clipped to the parent radius. Product imagery explicitly inherits the image-frame radius.
- Use `--sp-shadow-soft` for compact controls and `--sp-shadow-raised` only for sticky or modal surfaces.
- Do not hard-code circular controls unless the semantic object is inherently circular. Icon buttons follow the shared control radius.

## Interaction

- Minimum interactive target: 44×44 px.
- Use native links, buttons, inputs, fieldsets, and dialogs with visible focus.
- Press feedback may use `scale(.96)` with reduced-motion fallback; hover must not shift surrounding layout.
- Transitions list exact properties and normally last 150–300 ms; never use `transition: all` in new storefront work.
- Carousels support swipe, keyboard arrows, explicit controls, hover/focus pause, and reduced motion.

## Responsive layout

- Mobile: compact header, category rail, two-column product grid, fixed bottom navigation, safe-area-aware cart action.
- Desktop: category navigation, flexible catalog content, optional sticky cart sidebar, and wide global search.
- Filters: bottom sheet on mobile; compact centered dialog on desktop.
- Product page: edge-to-edge gallery and sticky action on mobile; large open gallery plus one coherent information/commercial column on desktop.
- Verify 375×812, 390×844, 844×390, 1024 wide, and 1440×900. No horizontal document overflow at 320 px or 200% zoom.

## Content and imagery

- RU, UZ, and EN must be complete; never render technical translation keys.
- Product title, price, unit, minimum order, availability, and preliminary-total language must remain unambiguous.
- Product photos use `object-contain` on clean white/neutral backgrounds and never reveal sharp image corners inside rounded frames.
- Popular-category artwork is one independent wide file per category: empty left text zone, product composition right, no embedded words or logos.
- Missing product photography uses the localized “photo coming soon” state.

## Accessibility and delivery checklist

- Contrast ≥4.5:1 for normal text and ≥3:1 for meaningful control boundaries/icons.
- Icon-only controls have accessible names; decorative icons are hidden.
- Color is not the only state signal; selected controls expose pressed/expanded/current semantics.
- Sticky UI does not obscure focus or content; all dialogs trap focus and close with Escape.
- Run tests, typecheck, lint, production build, `git diff --check`, responsive browser QA, and console-error review before delivery.

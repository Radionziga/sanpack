---
name: SANPACK Storefront
description: Clean multilingual B2B marketplace for packaging and food distribution
colors:
  sanpack-green: "#0F6E43"
  sanpack-green-deep: "#0A4B2E"
  leaf-accent: "#DCE9AF"
  canvas: "#F6F7F6"
  surface: "#FFFFFF"
  surface-inset: "#EFF2F0"
  ink: "#151B18"
  ink-secondary: "#4C5751"
  line: "#DCE2DE"
  control: "#EDF2EF"
  danger: "#B4233A"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(1.5rem, 2vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  nested: "10px"
  control: "14px"
  card: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.sanpack-green}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
---

# Design System: SANPACK Storefront

## Overview

**Creative North Star: “The Calm Wholesale Counter”**

SANPACK feels like a modern, trustworthy wholesale counter: product-led, bright, direct, and familiar enough that customers do not need to learn a new shopping language. Yandex Lavka establishes the usability bar, while SANPACK green, B2B terms, service modules, and real product photography keep the world proprietary.

The system is moderately dense on desktop and touch-comfortable on mobile. It uses white and softly tinted surfaces, almost no decorative chrome, and clear typographic hierarchy. Desktop, mobile web, and Telegram Mini App share one visual language.

**Key Characteristics:**

- Product imagery and price are the strongest signals.
- Green is reserved for selection, actions, availability, and navigation state.
- Cards are flat by default; elevation marks sticky, modal, or floating controls.
- Information is progressively disclosed instead of placed in competing panels.

## Colors

The palette pairs a deep botanical SANPACK green with warm-neutral whites and legible green-gray text.

### Primary

- **SANPACK Green** (`#0F6E43`): primary actions, selected navigation, availability, and key prices.
- **Deep SANPACK Green** (`#0A4B2E`): strong header surfaces and primary hover states.
- **Leaf Accent** (`#DCE9AF`): sparing secondary emphasis; never a substitute for primary action contrast.

### Neutral

- **Quiet Canvas** (`#F6F7F6`): page background.
- **Clean Surface** (`#FFFFFF`): product imagery, primary panels, and floating controls.
- **Inset Surface** (`#EFF2F0`): grouped secondary information and empty states.
- **Near-black Ink** (`#151B18`): headings and primary body text.
- **Secondary Ink** (`#4C5751`): descriptions and supporting facts.
- **Soft Line** (`#DCE2DE`): dividers and restrained control boundaries.

**The One Green Rule.** Green communicates action or state; it does not become a decorative wash across entire screens.

## Typography

**Display Font:** Manrope, sans-serif
**Body Font:** Manrope, sans-serif

**Character:** Manrope provides compact clarity without the excessive width of the brand display face. The official extended typography remains inside the SANPACK logo and print materials.

### Hierarchy

- **Display** (800, `clamp(2.25rem, 4vw, 3.75rem)`, 1.08): desktop product titles and singular page statements.
- **Headline** (800, `clamp(1.5rem, 2vw, 2rem)`, 1.15): catalog sections and category titles.
- **Title** (700–800, 1.125–1.5rem): cards, panels, and grouped form sections.
- **Body** (400–600, 0.875–1rem, 1.5): descriptions, field content, and commerce facts.
- **Label** (600, 0.75rem): field labels, compact actions, metadata, and controls.

**The Natural Case Rule.** Customer-facing labels use sentence case; uppercase is reserved for real abbreviations such as SKU.

## Layout

The desktop shell uses a maximum width of 1536 px with 16 px outer gutters, a 220 px category rail, flexible content, and an optional 300 px sticky cart. Product detail uses a large 7/12 gallery and a coherent 5/12 commercial-information column. Catalog headings and controls share one row when space allows.

Below 1024 px the category sidebar disappears; below 768 px the storefront becomes a touch-first two-column product grid with category rail and bottom navigation. Mobile product imagery is edge-to-edge beneath the header. Fixed controls include safe-area padding. The spacing rhythm is 4/8 based with 16 px component padding and 24–48 px section gaps.

## Elevation & Depth

The storefront is flat by default. Tonal layering and lines establish most hierarchy; soft shadows are reserved for floating icon controls, sticky cart/action bars, dialogs, and temporary overlays.

- **Soft control** (`0 4px 14px rgb(21 27 24 / 6%)`): compact floating controls.
- **Raised surface** (`0 12px 32px rgb(21 27 24 / 7%)`): sticky or modal surfaces only.

**The Earned Elevation Rule.** A shadow must explain why an element sits above another layer.

## Shapes

The base control radius is 14 px, nested shapes are approximately 10 px, and cards derive an 18 px radius. Inner content follows concentric radii and is clipped by the parent. Icon buttons use the shared control radius; they are not forced into circles. Product images inherit their frame radius so sharp bitmap corners never escape a rounded card.

## Components

### Buttons

- **Shape:** 14 px control radius and minimum 44 px touch target.
- **Primary:** SANPACK green, white label, typically 48 px high.
- **Hover / Focus:** deep green hover, exact-property 150–300 ms transitions, visible brand focus ring.
- **Press:** optional `scale(.96)` without layout movement and disabled under reduced motion.

### Chips

- **Style:** white or control-neutral surface with a restrained line.
- **State:** selected chips add green border, green text, and a soft green background; state is also exposed semantically.

### Cards / Containers

- **Corner Style:** 18 px derived card radius.
- **Background:** white or inset neutral; no gratuitous nested white cards.
- **Shadow Strategy:** flat at rest, elevated only when floating/sticky.
- **Internal Padding:** 16 px on compact surfaces, 24 px on large sections.

### Inputs / Fields

- **Style:** 48 px minimum height, neutral control background, 1 px boundary, 14 px radius.
- **Focus:** green border plus a subtle 3 px focus halo.
- **Error / Disabled:** semantic danger border and nearby message; disabled state remains visibly non-interactive.

### Navigation

The desktop header prioritizes logo, search, favorites, cart, language, and profile. Company, delivery, and contact pages live in the footer. Parent categories use separate navigation and disclosure controls. Mobile exposes at most five bottom-navigation destinations.

### Product Media

Product media is white, contained, and clipped. Popular-category tiles use independent 3:2 imagery with the left text zone empty and product composition on the right. Missing product photos use localized honest copy.

## Do's and Don'ts

### Do:

- **Do** use `--sp-*` semantic tokens and shared radii.
- **Do** keep interactive targets at least 44×44 px with visible focus.
- **Do** localize all customer-facing strings in Russian, Uzbek, and English.
- **Do** adapt topology across breakpoints while preserving the same visual language.

### Don't:

- **Don't** reintroduce duplicated information links into the main header.
- **Don't** mix unrelated category attributes in one filter panel.
- **Don't** use raw browser date controls for the delivery experience.
- **Don't** use collage crops, embedded image text, arbitrary circular icon buttons, or sharp image corners inside rounded frames.
- **Don't** use `transition: all`, invisible focus, or motion without a reduced-motion fallback in new storefront code.

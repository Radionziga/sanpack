# SANPACK catalog and commerce architecture

This document records the reusable catalog model implemented by the current
storefront and admin panel. It is intentionally small: the existing Firestore
repositories, `Product`, `ProductVariant`, `Attribute`, `Category` and
`SiteSettings` remain the source of truth.

## Catalog hierarchy

The supported CMS hierarchy is:

`Group -> Category -> optional Subcategory -> Product`

All nodes are existing `Category` documents with `parentId`. Depth is derived:
Group = 0, Category = 1, Subcategory = 2. Maximum three taxonomy levels;
arbitrary nesting is rejected, including moves that would over-deepen a subtree.
Products may remain directly in a Category even when it has Subcategories, or
point to a Subcategory. No migration, additional collection, or persisted path.

`categoryHierarchy.ts` is the shared lineage/scope/route/validation source.
Group scope includes Category and Subcategory products; Category scope includes
direct products and its children's products; Subcategory scope includes only
its own products. Attribute.categoryIds inherits down the same lineage for both
Product and Variant, including required/visibility/filter definitions.

Category URLs remain flat. Subcategory URLs nest under their Category (not Group).
Flat legacy Subcategory URLs redirect to the nested canonical. Breadcrumbs,
sitemap, navigation, search and PDF scope use the same helpers. Slugs remain
globally unique. Hidden ancestors exclude their branch from navigation/routes.
Homepage defaults to Categories; only explicit featured Subcategories join the
existing showcase. Category pages use compact optional-image navigation chips.

## Product and variant attributes

`Attribute` definitions are the schema. Their `key`, localized titles, `type`,
options, visibility and category applicability drive both admin and storefront.

- `Product.attributes` stores values shared by every sellable configuration.
- `ProductVariant.attributes` stores values that distinguish variants.
- A storefront filter evaluates a product as a set of coherent configurations:
  shared product attributes plus exactly one variant's attributes.
- Values from two different variants are never combined to satisfy one query.
- Facets aggregate values from both levels without copying variant values into
  `Product.attributes`.
- `Product.brandName` can be exposed by a CMS attribute whose key is `brand`;
  `brandName` remains the source of truth.

A required attribute is valid when it is set on the product, or when every
variant supplies it. Legacy variant keys remain readable, but the admin editor
offers applicable CMS attribute definitions instead of asking for arbitrary
internal keys.

## Typed filters

Filter UI and matching are derived from `Attribute.type`:

- `select`, `multiselect`, `text`: discrete values;
- `boolean`: yes/no control;
- `number`, `range`: numeric minimum/maximum;
- `color`: discrete values with a visual swatch when the value is a CSS color.

No category-specific React component is required for storage size, tire width,
fat percentage or another new CMS attribute.

## Prices

There are three separate concepts.

### Commercial price

`Product.price` or `ProductVariant.price` is the real price of one sellable
position. Cart totals, wholesale tiers and checkout continue to use it.

### Effective catalog price

`getEffectiveCatalogPrice` is shared by catalog cards, price sorting, PDF
catalog output and other preview surfaces. For a variant product it uses the
minimum variant sale price and marks the result as `from`.

### Comparison price

Optional `unitPricing` describes the physical contents of one priced position:

```ts
{ quantity: 500, unit: 'gram', displayUnit: 'kilogram' }
```

This can derive `price / kg`, `price / liter`, `price / piece`, `price / meter`
or `price / square meter`. Source and display units must have the same physical
dimension. Setting `catalogPriceBasis: 'comparison'` emphasizes the valid
derived price in catalog previews; if it is invalid or inconsistent across
variants the storefront safely falls back to the sale price.

Comparison pricing never changes the commercial price or order quantity. For
example, a 2 kg pack at 66,000 UZS may display 33,000 UZS/kg while remaining a
66,000 UZS pack in the cart.

## Quantity and packaging

- `salesUnit` / `unitCode`: the unit the customer orders.
- `minimumOrder`, `quantityStep`, `maximumOrder`: rules in sales units.
- Variant quantity fields may override product rules.
- `unitPricing`: physical contents used only for transparent comparison price.
- `orderPackaging`: an outer package that converts package minimum/step into
  sales-unit quantities.

Example: a roll is the sales unit, 30 rolls are in one box, minimum two boxes.
`orderPackaging` produces a minimum of 60 rolls. Informational attributes such
as `units_per_pack` must not become a second order-rule source of truth.

## Site identity

`SiteSettings` remains the only store configuration. Admin settings expose the
company name, logos, favicon, localized company descriptions, default SEO,
theme tokens and optional storefront service modules. SANPACK marketing page
content remains content rather than being mechanically converted into config.
Internal historic identifiers are not renamed for cosmetic white-labeling.

## Compatibility and migration

All new product fields are optional. Existing Firestore documents require no
backfill and continue to use sale-price behavior. No production migration was
applied as part of this change.

Existing records may later opt in to normalized pricing by adding
`unitPricing` to a product or variants and, if desired, setting
`catalogPriceBasis: 'comparison'`. Legacy informational attributes such as
`price_per_kg` remain readable until a separately audited, dry-run migration is
approved; they are not silently rewritten.

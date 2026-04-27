# Admin Design System

## Goals

- Keep the admin UI visually consistent across products, categories, clients, and future modules
- Prefer reusable primitives over page-local one-off styling
- Make spacing, radii, and widths easy to tune from shared tokens

## Token Layers

- `foundation/core.css`
  - color tokens
  - text tokens
  - motion tokens
  - global radius and spacing tokens
- `foundation/contract.css`
  - component sizing contracts
  - shared padding and radius values
  - toolbar, list item, badge, button, and table sizing

## Naming Rules

- Use `admin-catalog-*` for primitives shared by multiple admin catalog pages
- Use `admin-product-*`, `admin-category-*`, `admin-client-*` only for feature-specific behavior or visuals
- Use modifier classes like `is-active`, `is-open`, `is-dirty`, `is-online` for state
- Avoid encoding DOM position in selectors when a semantic modifier class can express intent better

## Shared Primitives

- Lists:
  - `admin-catalog-list`
  - `admin-catalog-list-item`
  - `admin-catalog-list-copy`
  - `admin-catalog-list-meta`
  - `admin-catalog-list-action`
- Feeds:
  - `admin-catalog-feed-item`
  - `admin-catalog-feed-main`
  - `admin-catalog-feed-aside`
- Toolbars:
  - `admin-product-toolbar`
  - `admin-product-toolbar-search`
  - `admin-product-toolbar-trigger`
  - `admin-product-toolbar-option`
- Selection surfaces:
  - `admin-product-selection-pill`
  - `admin-product-selection-pill-button`
- Table system:
  - explicit column classes such as `admin-product-details-col-*`
  - prefer `colgroup` for stable widths when precision matters

## Implementation Rules

- Move common spacing/radius/button metrics into `contract.css`
- Use feature files to define only feature-specific tokens and layout decisions
- Use theme files for visual treatment, not structural ownership
- Avoid `!important` except for narrow accessibility or browser-override cases

## Preferred Workflow

1. Add or reuse a shared token in `core.css` or `contract.css`
2. Reuse a shared primitive in `catalog-shared.css` when at least two features need it
3. Add feature overrides only if the primitive cannot express the behavior cleanly
4. Document any new reusable primitive in this file

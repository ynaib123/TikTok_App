# Admin CSS Structure

## Entry Points

- `admin.css`: global admin entry point loaded by `main.jsx`
- Legacy `admin-*.css` files: compatibility wrappers that forward to the new structure

## Folders

- `foundation/`
  - `core.css`: tokens, reset, and global admin foundation styles
  - `contract.css`: shared sizing contract for panels, badges, buttons, and sidebars
- `layout/`
  - `shell.css`: shell wrapper and remaining shared shell rules
  - `shell-nav.css`: navigation and topbar layout primitives
  - `shell-sidebar.css`: context sidebar and selection group primitives
  - `shell-panels.css`: reusable shell panel, stats, list, and badge primitives
  - `shell-modal.css`: modal shell primitives
  - `loading.css`: loading and route fallback shell
- `components/`
  - `feedback.css`: shared inline and floating feedback banners
  - `forms.css`: reusable form controls and media/form helpers
- `features/`
  - `auth.css`: login/authentication screen styles
  - `catalog.css`: catalog-level UI shared by admin pages
  - `catalog-shared.css`: shared visual layer used by products, categories, and clients
  - `products.css`: products page wrapper, tokens, and remaining specifics
  - `products-toolbar.css`: toolbar and selection-sidebar layer for products
  - `products-preview.css`: preview panel and preview actions
  - `products-editor.css`: editor form, media composer, and operations panel styles
  - `categories.css`: categories page specifics
  - `clients.css`: clients page specifics
- `themes/`
  - `shell-openai.css`: theme wrapper and remaining shell-theme overrides
  - `shell-openai-nav.css`: shell navigation theme overrides
  - `shell-openai-sidebar.css`: shell sidebar theme overrides
  - `products-dark.css`: products page theme overrides

## Shared Primitives

- Catalog controls:
  - `admin-product-toolbar`
  - `admin-product-toolbar-search`
  - `admin-product-toolbar-trigger`
  - `admin-product-toolbar-option`
  - `admin-product-active-filter-tag`
- Catalog list primitives:
  - `admin-catalog-list`
  - `admin-catalog-list-item`
  - `admin-catalog-list-copy`
  - `admin-catalog-list-meta`
  - `admin-catalog-list-action`
- Catalog feed/table primitives:
  - `admin-catalog-feed-item`
  - `admin-catalog-feed-main`
  - `admin-catalog-feed-aside`
  - product details table column classes via `admin-product-details-col-*`

## Contracts And Tokens

- Foundation tokens live in `foundation/core.css`
- Layout and breakpoint tokens live in `foundation/core.css`
- Shared size/radius/padding contracts live in `foundation/contract.css`
- Cross-feature catalog styling lives in `features/catalog-shared.css`
- Semantic tokens should bridge global primitives and page-level overrides before introducing ad hoc values
- Feature files should prefer overriding variables first, and only add bespoke selectors when structure or behavior is genuinely unique

## Documentation

- `DESIGN-SYSTEM.md`: admin UI tokens, primitives, and naming conventions
- `VISUAL-QA.md`: lightweight visual regression checklist for manual review

## Rule Of Thumb

- Add global tokens or reset logic in `foundation/`
- Add structural UI in `layout/`
- Add reusable building blocks in `components/`
- Add page or domain-specific styling in `features/`
- Avoid adding new `overrides` files unless they are temporary and scheduled for cleanup
- Prefer variable overrides and shared primitives before creating new page-specific blocks
- Reuse `--admin-bp-sm`, `--admin-bp-md`, `--admin-bp-lg`, and `--admin-bp-xl` for any new breakpoint work
- Reuse `--admin-nav-height`, `--admin-sidebar-width`, `--admin-sidebar-collapsed-width`, and `--admin-content-offset-x` before introducing hardcoded shell offsets

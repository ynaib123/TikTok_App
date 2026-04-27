# Admin Visual QA Checklist

## Before Merge

- Verify toolbar spacing, trigger states, and menu alignment on products, categories, and clients
- Verify list item hover, active, selected, and focus states on categories and clients
- Verify product details table column widths after any width or padding change
- Verify badges, pills, and action buttons share the same height and corner radius where intended
- Verify sidebar content scrolls cleanly without clipped shadows or hidden actions
- Verify long labels truncate gracefully with ellipsis where expected
- Verify empty states still align with surrounding panel spacing

## Responsive Checks

- Desktop wide viewport
- Desktop medium viewport
- Small laptop viewport
- Sidebar-open and sidebar-closed states when applicable

## Accessibility Checks

- Focus ring visible on toolbar controls, list items, action buttons, and modal actions
- Reduced-motion mode still feels usable
- Text contrast remains readable on selected, disabled, success, warning, and danger states

## Regression Hotspots

- `features/catalog.css`
- `features/catalog-shared.css`
- `features/products.css`
- `features/categories.css`
- `features/clients.css`
- `themes/products-dark.css`
- `themes/shell-openai.css`

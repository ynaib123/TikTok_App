# Admin styles — directory map

CSS is organised in four layers (loaded in this order via `index.css` /
per-page imports):

```
foundation/   tokens, resets, typography, color & spacing variables
themes/       theme-level overrides (dark, openai shell)
layout/       app shell — sidebar, top-bar, panels, modals, loading states
features/     per-feature stylesheets — narrow scope, named after the page
              or component they style
components/   only inside src/components/<thing>/<thing>.css when a component
              owns its own CSS (preferred for new components)
```

## Why some files are still big

| File | LOC | Status |
| --- | --- | --- |
| `features/video-ops.css` | ~1.6k | **Splitting in progress.** Modal styles already extracted to `accounts-modal.css`; dashboard styles to `video-dashboard.css`; step/loading styles to `tiktok-step.css`. Next: extract TikTok library/list blocks. |
| `layout/shell-workspace.css` | 1.7k | Owns the entire admin workspace grid + product-edit chrome. Plan: split into `shell-workspace-grid.css` and `shell-workspace-product.css`. |
| `features/products-catalog-base.css` | 1.5k | Catalog table + cards. Already partly factored across `catalog-core.css` / `catalog-shared.css`. |
| `features/journey.css` | 1.5k | TikTok journey wizard + library. Plan: split wizard from library. |
| `features/products.css` | 1.4k | Legacy product page chrome. Plan: fold what is reused into `catalog-shared.css`, delete the rest. |

## Rules of thumb

- **One feature, one file.** A new feature gets its own `features/<name>.css`,
  imported only from the page that mounts it. No global imports for
  feature-specific styles.
- **Co-locate per-component CSS.** When a component owns its visuals
  end-to-end (e.g. `components/video-card/video-card.css`), keep the CSS
  next to the component file. Don't add it to `features/`.
- **Inline styles are a code smell.** Replace with utility classes here. The
  refactor of `VideoDashboardPage` is the recent example: every `style={{…}}`
  was migrated to a `.video-dashboard-*` class in
  `features/video-dashboard.css`.
- **Delete dead CSS in the same PR as the JSX/TSX it referenced.**
  Use `npx vite build` + a grep for the class name to confirm.

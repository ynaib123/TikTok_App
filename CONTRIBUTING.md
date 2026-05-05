# Contributing to TikTok App

This file captures the conventions the codebase enforces. CI runs the same
checks on every PR (see `.github/workflows/ci.yml`); local pre-commit hooks
mirror them via `lint-staged` (see `Frontend/admin/package.json`).

## Convention: page légère, hook lourd, composant pur

The frontend admin is structured as three layers per feature:

1. **Page (`src/pages/<Feature>Page.tsx`).** Thin shell — imports the
   controller hook, renders presentational components. Targets ≤120 lines.
   `VideoDashboardPage.tsx` and `TikTokAccountsPage.tsx` are the canonical
   examples (87 and 200 lines respectively after refactor).

2. **Controller hook (`src/pages/use<Feature>Controller.ts`).** Owns local
   state, derived memos, side effects, and action handlers. Returns the data
   and callbacks the page needs. Heavy logic lives here — it can be > 400
   lines and that's fine.

3. **Presentational components (`src/components/<feature>/*.tsx`).** Receive
   typed props, render UI, do not own queries or business state. Examples:
   `AccountsList`, `AccountsServiceModal`, `AccountsStatsSection`.

When you add a feature, write the controller hook *first* (it's the spec for
what the page needs) and the components alongside; the page itself should be
the last thing you write.

## Style and structure

- **TypeScript first.** New files: `.tsx`/`.ts`. Migrating a `.jsx`/`.js` file
  is welcome but only when you also touch its tests in the same PR.
- **No inline styles.** Use a CSS class. Add the class to the per-feature
  file in `src/styles/features/` or co-locate it next to the component
  (`components/<thing>/<thing>.css`).
- **0 ESLint warnings.** CI runs `eslint --max-warnings=0`.
- **A11y.** Keep `jsx-a11y` warnings at zero. Follow the modal pattern in
  `components/AdminModal.jsx` (separate `<button>` backdrop + `role="dialog"`
  card; never put `onClick` on a non-interactive `<div>`).

## Tests

| Layer | Framework | Where |
| --- | --- | --- |
| Unit / pure logic | `node --test` (no DOM) | `src/**/*.test.js` |
| Component / DOM | Vitest + happy-dom | `src/**/*.vitest.{ts,tsx}` |
| Integration | Vitest with mocked Spring | (planned) |
| End-to-end | Playwright | `e2e/*.spec.{js,ts}` |
| Backend | JUnit 5 + Testcontainers | `Backend/src/test/java/**` |

Vitest is the strategic choice for new component/DOM tests. `node --test`
remains in place for the 33 pure-logic suites under `admin-dashboard/` because
they are fast and have no DOM dependency — don't migrate them just to migrate.

## Working with the n8n workflows

**Source of truth:** `Backend/tools/n8n-workflows/*.json`. The folder
`n8n-local/` is runtime state (n8n's SQLite + derived snapshots) and is
gitignored except for the `*.json` snapshots.

When you change a workflow:

1. Edit either the canonical JSON directly **or** the workflow in the n8n UI.
2. Run `pwsh Backend/tools/publish-n8n-workflows.ps1` (canonical → n8n) or
   `... -Export` (n8n → canonical) to keep both in sync.
3. Every callback HTTP request from n8n to the backend MUST include
   `X-Request-Id`, `X-Video-Ops-Callback-Secret`, and
   `X-Workflow-Contract-Version: '1'` (see
   `Backend/tools/n8n-workflows/README.md`). The repo's
   `Backend/tools/add-contract-headers.mjs` is idempotent — run it after a
   re-export to make sure no callback regressed.

## Workflow contract version

`com.tiktokapp.backend.config.WorkflowContract.CONTRACT_VERSION` is the only
place the version lives. Bump it together with `'X-Workflow-Contract-Version'`
in `add-contract-headers.mjs` and in the helper snippet at
`Backend/tools/n8n-workflows/callback-helper.js`. The backend logs (but does
not yet reject) callbacks with a mismatched version.

## Branches and PRs

- One PR = one logical change. Mojibake fixes, dead-code removal, and
  refactors live in their own PRs.
- Update or add tests in the same PR as the code change.
- Don't suppress eslint or typescript errors — fix the underlying issue.
- Don't commit `*.local`, `.env*`, or anything under `n8n-local/database*`.

## Cleanup notes

These artefacts are gitignored but can sit on disk locally — feel free to
delete when they're no longer needed:

- `n8n-local/database.sqlite.bak-*` — manual recovery snapshots from earlier
  imports.
- `n8n-local/backup-before-codex-import/` — frozen copy from before the
  Codex-driven workflow rewrite.
- `Frontend/admin/test-results/` — Playwright artefacts from the last run.

# Admin page conventions

Lessons learned from the TikTok journey & accounts refactor. Read this before adding a new admin page so we don't regrow monoliths.

## File layout

```
Frontend/admin/src/pages/<feature>/
  <Feature>Page.tsx              # thin shell — routing, layout, top-level state wiring
  <Feature>StepScreen.tsx        # if multi-step
  use<Feature>FlowState.ts       # reducer for the page state machine (typed)
  use<Feature>Steps.js           # action handlers per step (calls services, dispatches)
  use<Feature>Monitor.js         # polling, waitFor* helpers
  <feature>Helpers.{ts,js}       # pure functions (formatting, mergers, validators)
  __tests__/                     # vitest co-located if useful
```

Hard cap: **no single file over ~600 lines.** When you cross 500, split before it gets worse.

## State management

- One reducer per page (`useReducer`). Action types as a discriminated union. Reducer is pure — no I/O.
- Side effects live in step hooks (`use<Feature>Steps.js`). They call services and dispatch actions.
- Polling lives in monitor hooks (`use<Feature>Monitor.js`). They expose `waitFor<X>()` async functions.
- Don't put fetch calls inside `Page.tsx` — go through services.

## Types

- Workflow status / type / pipeline stage: import the unions from `types/workflow.ts`. Don't redeclare `'pending' | 'succeeded' | 'failed'` ad hoc.
- Backend enums are mirrored as TypeScript string-literal unions in `types/workflow.ts`. **If a backend enum changes, update that file in the same PR.**
- Service connection providers: import from `types/services.ts`.

## Services

- All HTTP calls go through `services/*Client.js` or `services/videoOpsSupabase.js`. Never `fetch()` from a page or hook.
- One file per logical backend grouping. Don't mix a TikTok call into the n8n client.

## Styling

- Use the `--admin-*` CSS custom properties from `styles/foundation/core.css`. No hardcoded hex colors in feature CSS.
- Feature CSS in `styles/features/<feature>.css`, imported once at the page entry.

## Workflow status conventions

- Trigger endpoints are **idempotent per `(contentIdeaId, workflowType)`** within `app.video-ops.idempotency-window-seconds`. Pass `force: true` when the user explicitly retries.
- Once a `WorkflowRun` reaches `SUCCEEDED` or `FAILED`, it's terminal — additional callbacks are ignored.
- Don't mark a run finished from the frontend; only the backend changes status (via callback or inline n8n response).

## Testing

- Vitest for pure helpers + reducers. Co-locate.
- Playwright E2E per **journey scenario**, not per page. Name spec files after the user goal:
  - `tiktok-journey.spec.js` — happy path
  - new specs as we add scenarios (e.g. `tiktok-render-recovery.spec.js`)
- E2E specs are gated by `PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E=true` so CI can opt in.

## When adding a new page

1. Create the folder + skeleton (Page, FlowState, Steps, Monitor, Helpers).
2. Define the reducer + actions before writing UI. Type the state.
3. Write services first, page second.
4. Add a smoke E2E touching the happy path of the new feature.
5. Update this doc if a convention changes.

## Anti-patterns we already burned on

- **One giant `*Page.tsx`** holding state + side effects + UI: led to 1000+ line files (TikTokAccountsPage). Split early.
- **Stringly-typed workflow status**: caused inconsistent state checks ("succeeded" vs "SUCCEEDED"). Use `types/workflow.ts` unions.
- **Storing n8n config in the DB**: caused malformed paths and runtime 502s. n8n config lives in `application.yml`.
- **Frontend handling workflow completion**: led to race conditions. Backend is the source of truth; frontend polls.
- **Force-flag defaulting to false on user-initiated retries**: previous `MAIN_PIPELINE` runs got reused silently. Default to `force: true` for explicit user actions.

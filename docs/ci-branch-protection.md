# CI and branch protection

## What runs

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request.
It has two parallel jobs:

- **backend** — `mvn -B test` (full test suite)
- **frontend** — `npm ci` → `npm run lint` → `npm run type-check` → `npm run build` → Playwright smoke E2E (`tiktok-journey.spec.js`) gated by `PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E=true`

Both jobs must pass for the workflow to be green.

## Required: turn on branch protection

The CI runs, but until branch protection is enabled in the GitHub UI, **a red CI does not block a merge**. To protect `main`:

1. Go to **Settings → Branches → Branch protection rules → Add rule** (repo: `ynaib123/TikTok_App`)
2. Branch name pattern: `main`
3. Enable:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging**
     - Add required checks: `backend` and `frontend` (the job names from `ci.yml`)
   - **Require branches to be up to date before merging**
   - (Optional) **Require signed commits**
   - (Optional) **Do not allow bypassing the above settings**
4. Save.

After this, no PR can merge into `main` while CI is red, and no one can push directly to `main`.

## Verifying the rule is active

Open a fresh PR and look at the merge box: it should say "Required: backend, frontend" and the merge button should be disabled until both jobs are green.

## When CI breaks

- **Backend test fails:** look at the surefire report inside the failed job artifacts; reproduce locally with `cd Backend && mvn -B test`. Don't bypass with `-Dtest=...` filtering — the CI runs the full suite on purpose.
- **Frontend lint fails:** `cd Frontend/admin && npm run lint -- --fix` for autofix candidates, then commit.
- **E2E fails:** logs are in the Playwright report artifact. Most often the journey spec fails because the local dev backend wasn't started in CI — verify the spec's setup hooks rather than weakening the assertions.

## Adding required checks

When new pages add their own E2E specs (per the per-journey convention in `admin-page-conventions.md`), include them in `ci.yml` as additional steps inside the `frontend` job — don't create a parallel job per spec, the cold-start cost dominates.

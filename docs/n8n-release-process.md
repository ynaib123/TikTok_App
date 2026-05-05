# n8n Release Process

The TikTok journey relies on **4 canonical n8n workflows**. Their webhook paths
are configured in `Backend/src/main/resources/application.yml` under
`app.video-ops.n8n.*`. There is no DB-stored override: `service_connections` no
longer carries an `N8N` row.

## Canonical workflows

| Workflow ID | Friendly name | Webhook path | Purpose |
|---|---|---|---|
| `q8OpzbRoQe8W8TzY` | `idea-script-fused` | `/webhook/fused-idea-script` | MAIN_PIPELINE — generate idea + script in one shot |
| `SAn6Iepn4rCpkHJg` | `render-template-video` | `/webhook/render-template-video` | RENDER_TEMPLATE_VIDEO — submit Shotstack render |
| `FVCRU7rTMuMCR1J3` | `check-shotstack` | `/webhook/check-shotstack` | CHECK_SHOTSTACK — poll Shotstack render status |
| `ql0Tg97q1cZ12aee` | `init-publish-tiktok` | `/webhook/init-publish-tiktok` | INIT_PUBLISH_TIKTOK — request TikTok upload URL |

The committed source-of-truth JSON for each workflow lives in
`Backend/tools/n8n-workflows/`. Treat that directory as the authoritative
version, and re-export from n8n into it after every workflow edit.

## Tooling

`Backend/tools/publish-n8n-workflows.ps1` wraps the n8n CLI inside the
`tiktok-app-n8n` container.

- **Export current state from the running n8n** (after editing workflows in the n8n UI):
  ```powershell
  ./Backend/tools/publish-n8n-workflows.ps1 -Export
  git add Backend/tools/n8n-workflows && git commit -m "n8n: update workflow export"
  ```

- **Publish committed JSON back into n8n** (after pulling someone else's changes,
  or restoring from disaster):
  ```powershell
  ./Backend/tools/publish-n8n-workflows.ps1
  ```

  The script imports each JSON and activates the corresponding workflow ID.

## Release steps

1. Edit the workflow in the n8n UI and verify it manually.
2. Run the script with `-Export` to refresh `Backend/tools/n8n-workflows/`.
3. Commit the JSON change with a message describing the workflow update.
4. Open a PR. CI runs the targeted backend tests + frontend build + smoke E2E.
5. After merge, on each environment, pull and run the script without `-Export`.
6. Confirm in the n8n UI that all four workflows are active.
7. Run the TikTok journey end-to-end (frontend smoke E2E) to verify.

## Verification checklist after deploy

- `application.yml` paths match the canonical webhook paths above.
- All 4 workflow IDs are listed by `docker exec tiktok-app-n8n n8n list:workflow` and shown as active.
- Backend logs show successful `workflow_accepted` events on a real run.
- `app.video-ops.allow-legacy-workflow-callback-secret` is `false` in production.

## Rollback

1. `git checkout <last-good-commit> -- Backend/tools/n8n-workflows`
2. Run `./Backend/tools/publish-n8n-workflows.ps1` to push the older JSON back.
3. `docker restart tiktok-app-n8n` if webhook routing seems stale.
4. Replay the TikTok smoke test.

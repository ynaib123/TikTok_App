# n8n Release Process

This project relies on a fixed set of n8n workflows for the TikTok journey. The backend now resolves the active webhook contract from either:

- `service_connections.metadata_json.workflowPaths` when an active `N8N` connection exists
- `app.video-ops.n8n.*` defaults from `application.yml`

## Critical workflow IDs

- `q8OpzbRoQe8W8TzY`: `idea-script-generation-fused`
- `4bkv7WDZfakybrD3`: `script-generation-maintainable`
- `FVCRU7rTMuMCR1J3`: `check-shotstack-fixed`
- `SAn6Iepn4rCpkHJg`: `render-professional-quality`
- `ql0Tg97q1cZ12aee`: `init-publish-tiktok-fixed`

## Release steps

1. Export or update `all-workflows-export.json` in the n8n container.
2. Run `Backend/tools/publish-n8n-workflows.ps1`.
3. Confirm the workflows are published and active in n8n.
4. Verify the backend startup log contains the resolved `video_ops n8n_contract` line.
5. Verify the active `service_connections` row still references the intended webhook paths when workflow-specific URLs are used.

## Verification checklist

- `renderTemplateVideo` and `checkShotstack` paths must match the active workflow URLs.
- Legacy callback secret fallback should stay disabled unless a controlled rollback requires it.
- Run the backend targeted tests and the frontend TikTok smoke E2E before releasing.

## Rollback

1. Re-import the last known-good workflow export.
2. Re-publish and re-activate the workflow IDs above.
3. Restart the n8n container.
4. Re-check the backend resolved contract and replay the TikTok smoke test.

# Ready-To-Import n8n Workflows

Ces fichiers sont des bases propres a importer dans n8n pour une instance distante, un reset local, ou une recreation controlee.

Pour l instance locale de ce repo, la source de verite runtime reste `n8n-local/database.sqlite`. Verifie d abord les workflows actifs avant de reimporter un export JSON.

## Fichiers

- `creation-ideas.json`
- `script-generation-single-llm.json`
- `render-template-video-with-callback.json`
- `init-publish-tiktok-fixed.json`
- `check-shotstack-fixed.json`
- `tiktok-account-context-example.json`

## Variables d'environnement attendues dans n8n

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET`
- `APP_VIDEO_OPS_TIKTOK_CLIENT_KEY`
- `APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET`
- `GROQ_API_KEY`
- `PEXELS_API_KEY`
- `SHOTSTACK_API_KEY`

## Ordre d'import

1. `init-publish-tiktok-fixed.json`
2. `script-generation-single-llm.json`
3. `render-template-video-with-callback.json`
4. `creation-ideas.json`
5. `check-shotstack-fixed.json`

## Notes

- Les callbacks backend utilisent:
  - `POST /api/video-ops/workflow-runs/{workflowRunId}/complete`
  - mode legacy: `X-Video-Ops-Callback-Secret`
  - mode recommande: `X-Video-Ops-Callback-Timestamp` + `X-Video-Ops-Callback-Signature`
- Les workflows webhook repondent toujours au backend, puis notent la completion via callback.
- Les secrets TikTok ne sont plus hardcodes dans les nodes.
- Les workflows courants de ce repo n utilisent plus de credential `Supabase account` pour `content_ideas` et `tiktok_accounts`.
- Les fichiers d audit historiques comme `templaten8n.txt` et certains diffs peuvent encore contenir des noms legacy (`Supabase account`, anciens nodes, anciens endpoints) a titre documentaire.
- Pour les prochains workflows TikTok sensibles, utilise `tiktok-account-context-example.json` comme base afin d appeler `POST /api/video-ops/internal/tiktok/account-context` au lieu de lire les tokens TikTok depuis une base externe.
- Migration HMAC detaillee: [docs/n8n-hmac-callback-setup.md](../n8n-hmac-callback-setup.md)
- Migration `account-context` detaillee: [docs/n8n-account-context-migration.md](../n8n-account-context-migration.md)
- Migration vers backend proxy securise: [docs/n8n-secure-backend-proxy-migration.md](../n8n-secure-backend-proxy-migration.md)
- Audit de l export reel des 5 workflows: [docs/n8n-workflows/templaten8n-audit.md](./templaten8n-audit.md)
- Diff concret reel vs repo: [docs/n8n-workflows/templaten8n-diff.md](./templaten8n-diff.md)
- Patch exact du workflow reel `init-publish-tiktok`: [docs/n8n-workflows/init-publish-tiktok-live-patch.md](./init-publish-tiktok-live-patch.md)

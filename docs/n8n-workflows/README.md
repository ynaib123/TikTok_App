# Ready-To-Import n8n Workflows

Ces fichiers sont des bases propres a importer dans n8n pour remplacer les workflows actuels.

## Fichiers

- `creation-ideas.json`
- `script-generation-single-llm.json`
- `render-template-video-with-callback.json`
- `init-publish-tiktok-fixed.json`
- `check-shotstack-fixed.json`

## Variables d'environnement attendues dans n8n

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET`
- `APP_VIDEO_OPS_TIKTOK_CLIENT_KEY`
- `APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET`
- `GROQ_API_KEY`
- `PEXELS_API_KEY`
- `SHOTSTACK_API_KEY`

## Credentials attendus

- `Supabase account`

## Ordre d'import

1. `init-publish-tiktok-fixed.json`
2. `script-generation-single-llm.json`
3. `render-template-video-with-callback.json`
4. `creation-ideas.json`
5. `check-shotstack-fixed.json`

## Notes

- Les callbacks backend utilisent:
  - `POST /api/video-ops/workflow-runs/{workflowRunId}/complete`
  - header `X-Video-Ops-Callback-Secret`
- Les workflows webhook repondent toujours au backend, puis notent la completion via callback.
- Les secrets TikTok ne sont plus hardcodes dans les nodes.

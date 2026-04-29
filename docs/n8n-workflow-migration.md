# n8n Workflow Migration

Ce repo ne pilote pas directement ton instance n8n, donc les workflows doivent etre reimportes ou modifies dans n8n apres ces changements backend/frontend.

## Nouvelles regles

- Tous les workflows declenches par le backend recoivent deja `workflowRunId`.
- En fin de workflow, n8n doit appeler:
  - `POST /api/video-ops/workflow-runs/{workflowRunId}/complete`
  - Header prefere:
    - `X-Video-Ops-Callback-Timestamp: <ISO-8601 UTC>`
    - `X-Video-Ops-Callback-Signature: <base64 hmac sha256>`
  - Header legacy temporaire:
    - `X-Video-Ops-Callback-Secret: <APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET>`
- Body succes:

```json
{
  "status": "SUCCEEDED",
  "message": "Workflow termine avec succes.",
  "responsePayload": "{\"ok\":true}"
}
```

- Body erreur:

```json
{
  "status": "FAILED",
  "message": "Workflow en echec.",
  "errorMessage": "Message d'erreur lisible"
}
```

## 1. init-publish-tiktok

Objectifs:

- ne plus utiliser le mauvais compte TikTok
- ne plus garder `client_key` / `client_secret` en dur

Changements:

- `Supabase Get content idea` doit lire la ligne cible et utiliser son `tiktok_account_open_id`
- `Supabase Get TikTok account` doit filtrer:
  - `open_id = {{ $('Supabase Get content idea').item.json.tiktok_account_open_id }}`
  - `refresh_token != null`
- `HTTP Request Refresh token` doit lire:
  - `client_key = {{$env.APP_VIDEO_OPS_TIKTOK_CLIENT_KEY}}`
  - `client_secret = {{$env.APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET}}`
- en fin de workflow, apres la mise a jour Supabase, appeler le callback backend avec `workflowRunId`

## 2. script-generation

Objectif:

- fusionner `script`, `caption` et `background keyword` en un seul appel LLM

Prompt recommande:

```text
Tu es un generateur de contenu TikTok.
Retourne uniquement un JSON valide avec les cles:
- script
- caption
- background_keyword

Contraintes:
- script: francais, naturel, court, pret pour une video TikTok
- caption: concise avec hashtags
- background_keyword: un seul mot-cle visuel exploitable pour la recherche media
```

Ensuite:

- parser le JSON dans un node `Code`
- mettre a jour Supabase en une seule fois
- appeler le callback backend en `SUCCEEDED` ou `FAILED`

## 3. check-shotstack

Objectif:

- corriger la requete des renders en attente

Le workflow actuel filtre `shotstack_status = queued` ET `shotstack_status = rendering`, ce qui est incoherent.

Fais plutot l un des deux:

- soit 2 branches separees `queued` et `rendering`
- soit un node `Code` qui filtre les lignes ou `shotstack_status` est dans `['queued', 'rendering']`

En plus:

- si Shotstack renvoie `done`, mettre `shotstack_url`, `shotstack_status = done`, `final_video_status = ready`
- si Shotstack renvoie `failed`, enregistrer une erreur metier visible

## 4. render-template-video

Objectifs:

- garder `workflowRunId`
- callback backend en fin de workflow

Ameliorations recommandees:

- fallback si Pexels ne renvoie rien
- choisir une video portrait stable, pas juste le premier resultat
- si Shotstack `render` echoue, callback `FAILED`

## 5. creation-ideas

Objectifs:

- ne plus coder `template_id` et `tiktok_account_open_id` en dur dans le workflow si ces valeurs doivent varier
- callback backend a la fin pour marquer le `workflowRunId` en `SUCCEEDED`

## Variables n8n conseillees

- `APP_VIDEO_OPS_TIKTOK_CLIENT_KEY`
- `APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET`
- `APP_VIDEO_OPS_BACKEND_BASE_URL`

## Ordre d application

1. `init-publish-tiktok`
2. `script-generation`
3. `render-template-video`
4. `creation-ideas`
5. `check-shotstack`

# Diff pratique entre les workflows reels et les versions propres du repo

Source reelle:

- [templaten8n.txt](/c:/TikTok_App/docs/n8n-workflows/templaten8n.txt)

Versions de reference du repo:

- [init-publish-tiktok-fixed.json](/c:/TikTok_App/docs/n8n-workflows/init-publish-tiktok-fixed.json)
- [check-shotstack-fixed.json](/c:/TikTok_App/docs/n8n-workflows/check-shotstack-fixed.json)
- [script-generation-single-llm.json](/c:/TikTok_App/docs/n8n-workflows/script-generation-single-llm.json)
- [creation-ideas.json](/c:/TikTok_App/docs/n8n-workflows/creation-ideas.json)
- [render-template-video-with-callback.json](/c:/TikTok_App/docs/n8n-workflows/render-template-video-with-callback.json)

## 1. init-publish-tiktok

Etat reel:

- deja branche sur `POST /api/video-ops/internal/tiktok/init-publish-context`
- callback HMAC deja present

Ecart principal avec la version propre:

- secrets et URL backend hardcodes dans le workflow reel

A garder:

- `HTTP Request Init Publish Context`
- `HTTP Request Video Head`
- `HTTP Request Init Publish`
- `Build Callback Auth`

A remplacer:

- URL backend `ngrok` hardcodee par `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `X-Video-Ops-Internal-Secret` hardcode par `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `hmacSecret` hardcode par `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

Resultat attendu:

- plus aucun secret TikTok ou backend dans le JSON exporte

## 2. check-shotstack-status

Etat reel:

- logique quasi alignee avec `check-shotstack-fixed.json`

Ecart principal:

- `x-api-key` Shotstack hardcode

A remplacer:

- `x-api-key` par `={{ $env.SHOTSTACK_API_KEY }}`

## 3. script-generation

Etat reel:

- callback HMAC deja present
- generation en un seul workflow

Ecart principal:

- cle Groq hardcodee
- URL backend hardcodee
- secret HMAC hardcode

A remplacer:

- `Authorization` Groq par `={{ 'Bearer ' + $env.GROQ_API_KEY }}`
- `backendBaseUrl` par `String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '')`
- `hmacSecret` par `String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET || '')`

## 4. creation-ideas

Etat reel:

- callback HMAC deja present
- `workflowRunId` deja transporte
- `tiktokAccountOpenId` deja transporte comme metadonnee

Ecart principal:

- cle Groq hardcodee
- URL backend hardcodee
- secret HMAC hardcode

A remplacer:

- `Authorization` Groq par `={{ 'Bearer ' + $env.GROQ_API_KEY }}`
- `backendBaseUrl` par `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `hmacSecret` par `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## 5. render-template-video

Etat reel:

- callback HMAC deja present
- pipeline metier globalement bon

Ecart principal:

- cle Groq hardcodee
- cle Pexels hardcodee
- cle Shotstack hardcodee
- URL backend hardcodee
- secret HMAC hardcode

A remplacer:

- `Authorization` Groq par `={{ 'Bearer ' + $env.GROQ_API_KEY }}`
- `Authorization` Pexels par `={{ $env.PEXELS_API_KEY }}`
- `x-api-key` Shotstack par `={{ $env.SHOTSTACK_API_KEY }}`
- `backendBaseUrl` par `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `hmacSecret` par `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## Ordre recommande

1. `init-publish-tiktok`
2. `script-generation`
3. `creation-ideas`
4. `render-template-video`
5. `check-shotstack-status`

## Definition de fini

Un workflow est aligne quand:

- il ne contient plus de secret en dur
- il ne contient plus d URL backend hardcodee
- il reutilise les variables d environnement attendues
- il garde son callback backend en HMAC

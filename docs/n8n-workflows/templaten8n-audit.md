# Audit des 5 workflows reels `n8n`

Source analysee:

- [templaten8n.txt](/c:/TikTok_App/docs/n8n-workflows/templaten8n.txt)

## Workflows detectes

1. `init-publish-tiktok`
2. `check-shotstack-status`
3. `script-generation`
4. `creation-ideas`
5. `render-template-video`

## Conclusion principale

Parmi ces 5 workflows reels:

- seul `init-publish-tiktok` touche encore l API TikTok
- il utilise deja `POST /api/video-ops/internal/tiktok/init-publish-context`
- aucun autre de ces 5 workflows n a besoin aujourd hui de `POST /api/video-ops/internal/tiktok/account-context`

Autrement dit:

- la migration `init-publish` vers le backend interne est bien en place
- il n y a pas, dans cet export precis, un deuxieme workflow TikTok sensible a migrer tout de suite

## Etat par workflow

### 1. `init-publish-tiktok`

Etat:

- bon pattern backend interne pour TikTok
- callback HMAC deja en place
- prepare l `upload_url` via TikTok avec `accessToken` fourni par le backend

Points a corriger:

- `backendBaseUrl` hardcode dans `Build Callback Auth`
- `hmacSecret` hardcode dans `Build Callback Auth`
- `X-Video-Ops-Internal-Secret` hardcode dans `HTTP Request Init Publish Context`
- URL backend `ngrok` hardcodee dans `HTTP Request Init Publish Context`

Cible recommandee:

- utiliser `APP_VIDEO_OPS_BACKEND_BASE_URL`
- utiliser `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`
- utiliser `APP_VIDEO_OPS_INTERNAL_API_SECRET`

### 2. `check-shotstack-status`

Etat:

- aucun secret TikTok
- logique metier coherent avec la version de repo

Points a corriger:

- cle Shotstack hardcodee dans `HTTP Request Shotstack Status`

Cible recommandee:

- utiliser `SHOTSTACK_API_KEY`

### 3. `script-generation`

Etat:

- aucun secret TikTok
- callback HMAC deja en place

Points a corriger:

- cle Groq hardcodee
- `backendBaseUrl` hardcode
- `hmacSecret` hardcode

Cible recommandee:

- utiliser `GROQ_API_KEY`
- utiliser `APP_VIDEO_OPS_BACKEND_BASE_URL`
- utiliser `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

### 4. `creation-ideas`

Etat:

- aucun secret TikTok
- callback HMAC deja en place
- transmet bien `tiktok_account_open_id` comme metadonnee de contenu

Points a corriger:

- cle Groq hardcodee
- `backendBaseUrl` hardcode
- `hmacSecret` hardcode

Cible recommandee:

- utiliser `GROQ_API_KEY`
- utiliser `APP_VIDEO_OPS_BACKEND_BASE_URL`
- utiliser `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

### 5. `render-template-video`

Etat:

- aucun secret TikTok
- callback HMAC deja en place

Points a corriger:

- cle Groq hardcodee
- cle Pexels hardcodee
- cle Shotstack hardcodee
- `backendBaseUrl` hardcode
- `hmacSecret` hardcode

Cible recommandee:

- utiliser `GROQ_API_KEY`
- utiliser `PEXELS_API_KEY`
- utiliser `SHOTSTACK_API_KEY`
- utiliser `APP_VIDEO_OPS_BACKEND_BASE_URL`
- utiliser `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## Priorite pratique

La prochaine priorite utile n est pas une migration TikTok supplementaire sur ces 5 workflows.

La prochaine priorite utile est:

1. supprimer les secrets hardcodes des workflows reels
2. aligner ces workflows sur les versions parametrees du repo
3. garder `account-context` pret pour le jour ou un nouveau workflow `n8n` devra appeler TikTok hors `init-publish`

## Recommandation

Pour tes 5 workflows existants:

- `init-publish-tiktok` : conserver la logique actuelle mais remplacer les secrets/URLs hardcodes par des variables `n8n`
- `script-generation` : aligner sur `script-generation-single-llm.json`
- `creation-ideas` : aligner sur `creation-ideas.json`
- `render-template-video` : aligner sur `render-template-video-with-callback.json`
- `check-shotstack-status` : aligner sur `check-shotstack-fixed.json`

## Variables `n8n` a avoir

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`
- `GROQ_API_KEY`
- `PEXELS_API_KEY`
- `SHOTSTACK_API_KEY`

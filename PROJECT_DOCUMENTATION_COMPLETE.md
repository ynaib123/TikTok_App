# Documentation Complete du Projet

Document consolide genere automatiquement depuis les fichiers de documentation et workflows documentaires du depot.

## Contenu inclus

- `README.md`
- `WORK_SUMMARY.md`
- `docs\n8n-account-context-migration.md`
- `docs\n8n-hmac-callback-setup.md`
- `docs\n8n-secure-backend-proxy-migration.md`
- `docs\n8n-webhook-migration-guide.md`
- `docs\n8n-workflow-migration.md`
- `docs\n8n-workflows\check-shotstack-fixed.json`
- `docs\n8n-workflows\creation-ideas.json`
- `docs\n8n-workflows\init-publish-tiktok-fixed.json`
- `docs\n8n-workflows\init-publish-tiktok-live-patch.md`
- `docs\n8n-workflows\README.md`
- `docs\n8n-workflows\render-template-video-with-callback.json`
- `docs\n8n-workflows\script-generation-single-llm.json`
- `docs\n8n-workflows\templaten8n.txt`
- `docs\n8n-workflows\templaten8n-audit.md`
- `docs\n8n-workflows\templaten8n-diff.md`
- `docs\n8n-workflows\tiktok-account-context-example.json`
- `docs\video-ops-state-machine.md`
- `n8n-local\check-live.json`
- `n8n-local\creation-live.json`
- `n8n-local\init-live.json`
- `n8n-local\render-live.json`
- `n8n-local\script-live.json`
- `n8n-local\config`

## Documents

### README.md

```md
# TikTok App

Projet local compose de :

- `Backend/` : API Spring Boot pour l authentification admin et les endpoints backoffice
- `Frontend/admin/` : backoffice React/Vite
- `n8n-local/` : instance locale n8n et exports de workflows
- `supabase/` : artefacts legacy conserves pour compatibilite documentaire
- `docker-compose.yml` : PostgreSQL + backend Spring + n8n + frontend

## Prerequis

- Docker Desktop
- Node.js 18+
- npm
- Java 17 si tu veux lancer le backend hors Docker

## Lancement rapide

### 1. Backend + PostgreSQL

Depuis la racine :

```bash
docker compose up --build -d
```

Backend : `http://localhost:8080`

Compte admin cree automatiquement avec les valeurs de ton `.env` :

- email : `admin@tiktokapp.local`
- mot de passe : `APP_ADMIN_PASSWORD`

### 2. Frontend admin

```bash
cd Frontend/admin
npm install
npm run dev
```

Backoffice : `http://localhost:5174`

## Configuration frontend admin

Fichier local : `Frontend/admin/.env.local`

Configuration actuelle recommandee :

```properties
VITE_API_BASE_URL=/api
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:8080
VITE_USE_MOCK_ADMIN_AUTH=false
VITE_ALLOWED_HOSTS=<ton-host-ngrok-si-utilise>
VITE_MOCK_ADMIN_EMAIL=<optionnel-si-mock-auth>
VITE_MOCK_ADMIN_PASSWORD=<optionnel-si-mock-auth>
```

Notes importantes :

- `VITE_API_BASE_URL=/api` permet d utiliser le proxy Vite et evite les problemes CSRF en local
- `VITE_BACKEND_PROXY_TARGET` doit pointer vers le backend Spring expose par Docker sur `http://127.0.0.1:8080`
- `VITE_ALLOWED_HOSTS` est utile si tu ouvres le frontend via `ngrok` ou un autre host externe
- le frontend admin ne doit plus appeler directement les webhooks `n8n` ni exposer de secrets backend
- `VITE_MOCK_ADMIN_EMAIL` et `VITE_MOCK_ADMIN_PASSWORD` ne sont necessaires que si tu actives `VITE_USE_MOCK_ADMIN_AUTH=true`

Si tu veux un setup 100% Docker, tu peux aussi utiliser directement :

```bash
docker compose up --build -d
```

Puis ouvrir :

- backend : `http://localhost:8080`
- frontend admin : `http://localhost:5174`
- n8n : `http://localhost:5678`

## Configuration backend video ops

Variables backend recommandees pour un fonctionnement complet :

```properties
POSTGRES_PASSWORD=...
APP_ADMIN_PASSWORD=...
APP_JWT_SECRET=...
N8N_ENCRYPTION_KEY=...
APP_ALLOWED_ORIGINS=http://localhost:5174,https://<ton-host-ngrok>
APP_VIDEO_OPS_N8N_MAIN_PIPELINE_WEBHOOK=...
APP_VIDEO_OPS_N8N_CHECK_SHOTSTACK_WEBHOOK=...
APP_VIDEO_OPS_N8N_RENDER_TEMPLATE_WEBHOOK=...
APP_VIDEO_OPS_N8N_PUBLISH_TIKTOK_WEBHOOK=...
APP_VIDEO_OPS_INTERNAL_API_SECRET=...
APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET=...
APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET=...
APP_VIDEO_OPS_WORKFLOW_CALLBACK_MAX_SKEW_SECONDS=300
APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true
APP_VIDEO_OPS_TOKEN_ENCRYPTION_KEY=...
APP_VIDEO_OPS_TIKTOK_CLIENT_KEY=...
APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET=...
APP_VIDEO_OPS_TIKTOK_REDIRECT_URI=https://ai-video-publisher.vercel.app/tiktok-callback
APP_VIDEO_OPS_TIKTOK_OAUTH_SCOPES=user.info.basic,video.publish
APP_VIDEO_OPS_ALLOWED_SHOTSTACK_HOSTS=shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com
APP_VIDEO_OPS_ALLOWED_UPLOAD_HOSTS=open-upload.tiktokapis.com,open.tiktokapis.com,business-api.tiktok.com
```

Notes backend pro :

- `POSTGRES_PASSWORD`, `APP_ADMIN_PASSWORD`, `APP_JWT_SECRET`, `APP_VIDEO_OPS_INTERNAL_API_SECRET`, `APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET`, `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`, `APP_VIDEO_OPS_TOKEN_ENCRYPTION_KEY` et `N8N_ENCRYPTION_KEY` sont des secrets obligatoires.
- `APP_VIDEO_OPS_TOKEN_ENCRYPTION_KEY` active le chiffrement applicatif des tokens TikTok stockes en base PostgreSQL locale.
- `APP_VIDEO_OPS_INTERNAL_API_SECRET` permet a n8n d'appeler les endpoints backend internes sans exposer les tokens TikTok.
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET` active l authentification HMAC des callbacks n8n.
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET` reste disponible en mode legacy pendant la migration.
- si `APP_VIDEO_OPS_TOKEN_ENCRYPTION_KEY` est configuree, le backend rechiffre automatiquement au demarrage les anciens tokens TikTok encore en clair.
- la machine d etat video ops est documentee dans [docs/video-ops-state-machine.md](docs/video-ops-state-machine.md).

## Auth admin

Endpoints principaux :

- `GET /api/admins/csrf-token`
- `POST /api/admins/login`
- `POST /api/admins/refresh`
- `POST /api/admins/logout`

Le backend utilise :

- cookie CSRF
- access token admin
- refresh token via cookie HttpOnly

## Video Ops et PostgreSQL local

Le backoffice passe maintenant par le backend Spring pour :

- `content_ideas`
- `tiktok_accounts`
- les mises a jour de pipeline
- les declenchements `n8n`

Le backend lit et met a jour ces donnees via JPA sur PostgreSQL local. Il n y a plus d appels HTTP backend vers Supabase pour `content_ideas` et `tiktok_accounts`.

Le dossier `supabase/` reste present uniquement pour des artefacts legacy et de transition.

Si tu veux auditer d anciens flux ou une ancienne integration front, il reste un script legacy :

- `supabase/rls_video_ops_read_access.sql`

Ce script ne fait pas partie du chemin nominal courant.

Attention :

- cette solution est uniquement legacy / secours local
- pour une version securisee, garde le mode actuel `frontend -> backend Spring -> PostgreSQL local / n8n`

## n8n local

L instance locale `n8n` charge ses workflows depuis `n8n-local/database.sqlite`.

Au 2 mai 2026, la base locale contient deja les workflows actifs migres pour :

- `creation-ideas`
- `script-generation-single-llm`
- `render-template-video-with-callback`
- `check-shotstack-fixed`
- `init-publish-tiktok-fixed`

Les fichiers JSON dans `n8n-local/` et `docs/n8n-workflows/` restent utiles pour revision, export ou reimport manuel, mais un reimport n est pas requis tant que les workflows actifs en base restent ceux-la.

## Endpoints backend utiles

Admin auth :

- `GET /api/admins/csrf-token`
- `POST /api/admins/login`
- `POST /api/admins/refresh`
- `POST /api/admins/logout`

TikTok upload :

- `POST /api/tiktok/upload`

Video ops :

- `GET /api/video-ops/dashboard`
- `GET /api/video-ops/content-ideas`
- `GET /api/video-ops/manual-actions`
- `GET /api/video-ops/tiktok-accounts`
- `GET /api/video-ops/observability`
- `POST /api/video-ops/tiktok-oauth/authorize`
- `POST /api/video-ops/tiktok-oauth/callback`
- `POST /api/video-ops/workflows/main-pipeline`
- `POST /api/video-ops/workflows/check-shotstack`
- `POST /api/video-ops/workflows/render-template`
- `POST /api/video-ops/workflows/init-publish`
- `GET /api/video-ops/workflow-runs/{id}`
- `POST /api/video-ops/workflow-runs/{id}/complete`
- `POST /api/video-ops/internal/tiktok/init-publish-context`
- `POST /api/video-ops/internal/tiktok/account-context`
- `POST /api/video-ops/content-ideas/{id}/upload`
- `POST /api/video-ops/content-ideas/{id}/publish`

Guides utiles:

- migration HMAC des callbacks `n8n` : [docs/n8n-hmac-callback-setup.md](docs/n8n-hmac-callback-setup.md)
- migration des workflows TikTok sensibles via `account-context` : [docs/n8n-account-context-migration.md](docs/n8n-account-context-migration.md)
- migration vers le mode backend proxy securise : [docs/n8n-secure-backend-proxy-migration.md](docs/n8n-secure-backend-proxy-migration.md)

## Scripts frontend admin

Depuis `Frontend/admin` :

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## Structure du projet

```text
TikTok_App/
|-- Backend/
|   |-- src/
|   `-- pom.xml
|-- Frontend/
|   |-- admin/
|   `-- shared/
|-- supabase/
|   `-- rls_video_ops_read_access.sql
|-- docker-compose.yml
`-- README.md
```

## Nettoyage

Les artefacts generes ne doivent pas etre conserves :

- `Backend/target/`
- `Backend/*.log`
- `Frontend/admin/dist/`
- `node_modules/`
- `Frontend/admin/node_modules/`

Pour regenirer :

- backend : relancer Maven ou Docker
- frontend : `npm install` puis `npm run dev`

```

### WORK_SUMMARY.md

_Fichier vide._

### docs\n8n-account-context-migration.md

```md
# n8n TikTok Account Context

Ce guide sert pour les prochains workflows `n8n` qui ont encore besoin d un `access_token` TikTok ou d un `creator_info` a jour.

Objectif:

- ne plus lire `refresh_token` ou `access_token` depuis `tiktok_accounts` dans `n8n`
- deleguer le refresh token et la lecture optionnelle de `creator_info` au backend
- garder les secrets TikTok seulement dans le backend

## Endpoint backend a utiliser

`POST /api/video-ops/internal/tiktok/account-context`

Header obligatoire:

```text
X-Video-Ops-Internal-Secret: <APP_VIDEO_OPS_INTERNAL_API_SECRET>
```

Body minimal:

```json
{
  "tiktokAccountOpenId": "open-id-demo"
}
```

Body avec `creator_info`:

```json
{
  "tiktokAccountOpenId": "open-id-demo",
  "includeCreatorInfo": true
}
```

Reponse:

```json
{
  "tiktokAccountOpenId": "open-id-demo",
  "accessToken": "access-token-temporaire",
  "tokenType": "Bearer",
  "scope": "user.info.basic,video.publish",
  "privacyLevelOptions": ["SELF_ONLY", "PUBLIC_TO_EVERYONE"],
  "selectedPrivacyLevel": "SELF_ONLY"
}
```

## Quand l utiliser

Utilise cet endpoint quand un workflow `n8n` doit:

- appeler une API TikTok avec un `Authorization: Bearer ...`
- connaitre les `privacy_level_options`
- choisir un niveau de privacy avant une action TikTok

Ne l utilise pas pour:

- relire la liste des comptes depuis le backoffice
- reconnecter un compte TikTok
- preparer l `upload_url` de `init-publish`, qui a deja son endpoint dedie `internal/tiktok/init-publish-context`

## Pattern recommande dans n8n

1. Le workflow recoit `tiktokAccountOpenId`
2. Il appelle `POST /api/video-ops/internal/tiktok/account-context`
3. Il reutilise `accessToken` pour les appels TikTok suivants
4. Si besoin, il reutilise `selectedPrivacyLevel` ou `privacyLevelOptions`
5. Il ne lit plus `tiktok_accounts.refresh_token` ni `tiktok_accounts.access_token`

## Mapping n8n conseille

Dans un node `HTTP Request`:

- Method: `POST`
- URL:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/tiktok/account-context' }}
```

- Headers:

```text
Content-Type: application/json
X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

- Body:

```json
={{
  {
    tiktokAccountOpenId: $json.tiktokAccountOpenId,
    includeCreatorInfo: true
  }
}}
```

Ensuite, pour un appel TikTok:

```text
Authorization: {{ $json.tokenType + ' ' + $json.accessToken }}
```

## Workflow exemple

Le repo contient une base prete a importer:

- [docs/n8n-workflows/tiktok-account-context-example.json](docs/n8n-workflows/tiktok-account-context-example.json)

Ce workflow:

- recoit `tiktokAccountOpenId`
- appelle le backend interne
- renvoie les champs utiles normalises pour la suite

## Migration type d un ancien workflow sensible

Avant:

- `Supabase Get TikTok Account`
- lecture de `refresh_token`
- appel `https://open.tiktokapis.com/v2/oauth/token/`
- parfois appel `creator_info`

Apres:

- suppression de `Supabase Get TikTok Account`
- suppression du refresh token dans `n8n`
- ajout d un appel `internal/tiktok/account-context`
- conservation des seuls appels TikTok metier utiles

## Checklist de validation

- `APP_VIDEO_OPS_INTERNAL_API_SECRET` est configure cote backend et cote `n8n`
- le workflow `n8n` ne lit plus `tiktok_accounts.access_token`
- le workflow `n8n` ne lit plus `tiktok_accounts.refresh_token`
- l appel backend interne repond `200`
- les appels TikTok suivants utilisent bien `accessToken` fourni par le backend

```

### docs\n8n-hmac-callback-setup.md

```md
# n8n HMAC Callback Setup

Ce guide remplace progressivement le header legacy `X-Video-Ops-Callback-Secret` par une signature HMAC.

## Variables a definir

Cote backend:

```properties
APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET=<secret-long-et-random>
APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true
```

Cote n8n:

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

Quand les 4 workflows webhook seront migres et testes:

```properties
APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=false
```

## Principe

Le backend attend:

- `X-Video-Ops-Callback-Timestamp`
- `X-Video-Ops-Callback-Signature`

Signature calculee sur cette chaine canonique:

```text
POST
/api/video-ops/workflow-runs/<workflowRunId>/complete
<timestamp ISO UTC>
<base64 sha256 du body brut>
```

Puis:

```text
signature = base64(hmac_sha256(secret, canonical))
```

## Pattern recommande dans n8n

Pour chaque workflow webhook:

1. Garder le node `Callback Success` de type `HTTP Request`
2. Avant lui, ajouter un node `Code` nomme `Build Callback Auth`
3. Le `Code` produit:
   - `callbackUrl`
   - `callbackTimestamp`
   - `callbackSignature`
   - `callbackBody`
4. Le node `Callback Success` lit ces 4 champs

## Code node standard

Node `Code` nomme `Build Callback Auth`:

```javascript
const crypto = require('crypto');

const backendBaseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '');
const hmacSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET || '');
const workflowRunId = Number($json.workflowRunId || $('Set Input').item.json.workflowRunId || 0);

if (!backendBaseUrl) {
  throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');
}

if (!hmacSecret) {
  throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET manquante');
}

if (!workflowRunId) {
  throw new Error('workflowRunId manquant pour le callback');
}

const requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;
const callbackUrl = `${backendBaseUrl}${requestPath}`;
const callbackTimestamp = new Date().toISOString();
const callbackBodyObject = {
  status: 'SUCCEEDED',
  message: 'Workflow termine avec succes.',
  responsePayload: JSON.stringify({
    workflowRunId,
  }),
};
const callbackBody = JSON.stringify(callbackBodyObject);
const payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');
const canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\n');
const callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');

return [{
  json: {
    ...$json,
    callbackUrl,
    callbackTimestamp,
    callbackSignature,
    callbackBody,
  }
}];
```

## Callback Success node

Config commune:

- Method: `POST`
- URL:

```text
={{ $json.callbackUrl }}
```

- Headers:

```text
Content-Type: application/json
X-Video-Ops-Callback-Timestamp: {{ $json.callbackTimestamp }}
X-Video-Ops-Callback-Signature: {{ $json.callbackSignature }}
```

- Body Content Type: `RAW`
- Raw Content Type: `application/json`
- Body:

```text
={{ $json.callbackBody }}
```

## Workflow par workflow

### 1. init-publish-tiktok-fixed

Branchement:

- `Supabase Update Content Idea` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Dans `Build Callback Auth`, garde comme source de `workflowRunId`:

```javascript
Number($('Set Input').item.json.workflowRunId || 0)
```

Dans `callbackBodyObject`, tu peux enrichir:

```javascript
responsePayload: JSON.stringify({
  contentIdeaId: $('Supabase Get Content Idea').item.json.id,
  uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || ''
})
```

### 2. script-generation-single-llm

Branchement:

- `Supabase Update Script` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Source `workflowRunId`:

```javascript
Number($json.workflowRunId || 0)
```

### 3. render-template-video-with-callback

Branchement:

- `Supabase Update Shotstack Request` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Source `workflowRunId`:

```javascript
Number($('Set Input').item.json.workflowRunId || 0)
```

### 4. creation-ideas

Branchement:

- `Finalize Count` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Source `workflowRunId`:

```javascript
Number($json.workflowRunId || 0)
```

## Strategie de migration

1. Migrer `init-publish-tiktok-fixed`
2. Tester depuis le front
3. Migrer `script-generation-single-llm`
4. Migrer `render-template-video-with-callback`
5. Migrer `creation-ideas`
6. Laisser `APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true` pendant les tests
7. Quand tout est vert, passer a `false`

## Verification rapide

Quand un callback HMAC passe:

- le node `Callback Success` est vert
- le backend repond `200`
- `video_workflow_runs.status = SUCCEEDED`
- le front n attend plus longtemps qu avant

## Etape suivante recommandee

Une fois `init-publish-tiktok` migre vers l'endpoint backend interne:

- n8n n'a plus besoin de lire `refresh_token` ou `access_token` depuis Supabase
- tu peux definir `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- puis activer `APP_VIDEO_OPS_TOKEN_ENCRYPTION_KEY`
- pour d'autres workflows sensibles, n8n peut aussi utiliser `POST /api/video-ops/internal/tiktok/account-context`

Le backend rechiffre automatiquement au demarrage les anciens tokens TikTok encore en clair dans `tiktok_accounts`.

```

### docs\n8n-secure-backend-proxy-migration.md

```md
# Migration vers le mode le plus securise

Objectif:

- `Accounts` stocke les credentials et cles API
- `n8n` n appelle plus directement Groq, Pexels, Shotstack
- `n8n` appelle seulement le backend
- le backend appelle lui-meme Groq, Pexels, Shotstack et Supabase

## Ce qui est maintenant en place dans le repo

Backend:

- `POST /api/video-ops/internal/groq/chat-completions`
- `POST /api/video-ops/internal/pexels/videos/search`
- `POST /api/video-ops/internal/shotstack/render`
- `GET /api/video-ops/internal/shotstack/render/{renderId}`

Le backend:

- verifie `X-Video-Ops-Internal-Secret`
- lit les credentials depuis `service_connections`
- dechiffre les secrets stockes
- appelle l API externe a la place de `n8n`

Supabase:

- le backend sait maintenant utiliser la connexion `SUPABASE` de `Accounts` si elle est configuree
- sinon il garde le fallback vers les variables backend existantes

## Ce que `Accounts` doit contenir

### Supabase

- `baseUrl`: URL projet Supabase
- `secretValue`: service role key

### Groq

- `baseUrl`: `https://api.groq.com`
- `secretValue`: API key Groq

### Pexels

- `baseUrl`: `https://api.pexels.com`
- `secretValue`: API key Pexels

### Shotstack

- `baseUrl`: `https://api.shotstack.io`
- `secretValue`: API key Shotstack

## Ce que `n8n` doit encore garder

En mode cible, `n8n` n a plus besoin des cles externes de:

- Groq
- Pexels
- Shotstack
- Supabase service role key

`n8n` garde seulement:

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## Remplacements a faire dans les workflows

### 1. Script generation

Avant:

- `HTTP Request` vers `https://api.groq.com/openai/v1/chat/completions`
- header `Authorization: Bearer <GROQ_API_KEY>`

Apres:

- `HTTP Request` vers:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/groq/chat-completions' }}
```

- headers:

```text
Content-Type: application/json
X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

- body:

le meme JSON que celui envoye a Groq aujourd hui

### 2. Creation ideas

Avant:

- `HTTP Request` direct Groq

Apres:

- meme remplacement que pour `script-generation`

### 3. Render template video

Avant:

- `HTTP Request` direct Groq
- `HTTP Request` direct Pexels
- `HTTP Request` direct Shotstack

Apres:

- Groq:

```text
POST /api/video-ops/internal/groq/chat-completions
```

- Pexels:

```text
POST /api/video-ops/internal/pexels/videos/search
```

Body exemple:

```json
{
  "query": "fitness",
  "perPage": 5,
  "orientation": "portrait"
}
```

- Shotstack render:

```text
POST /api/video-ops/internal/shotstack/render
```

avec le meme body JSON que l appel Shotstack actuel

### 4. Check shotstack status

Avant:

- `GET https://api.shotstack.io/v1/render/<renderId>`

Apres:

- `GET` vers:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/shotstack/render/' + $json.shotstack_render_id }}
```

- header:

```text
X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

## Ordre recommande

1. `init-publish-tiktok`
2. `script-generation`
3. `creation-ideas`
4. `render-template-video`
5. `check-shotstack-status`

## Benefice final

Quand cette migration est terminee:

- `n8n` ne stocke plus les cles API tierces
- `Accounts` devient la source de verite des credentials
- la rotation des credentials se fait cote backoffice
- les exports JSON `n8n` ne contiennent plus de secrets externes

```

### docs\n8n-webhook-migration-guide.md

_Fichier vide._

### docs\n8n-workflow-migration.md

```md
# n8n Workflow Migration

Ce repo ne pilote pas automatiquement toutes les instances n8n.

Pour une instance distante ou partagee, les workflows doivent etre reimportes ou modifies dans n8n apres ces changements backend/frontend.

Pour l instance locale de ce repo (`n8n-local/database.sqlite`), verifie d abord les workflows actifs avant de reimporter: la base peut deja contenir une version plus recente que les exports legacy.

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

```

### docs\n8n-workflows\check-shotstack-fixed.json

```json
{
  "name": "check-shotstack-fixed",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "check-shotstack",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-840, 100]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            { "name": "contentIdeaId", "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}", "type": "number" },
            { "name": "workflowRunId", "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}", "type": "number" }
          ]
        },
        "options": {}
      },
      "id": "set-input",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [-600, 100]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $json.contentIdeaId }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "options": {}
      },
      "id": "get-idea",
      "name": "Backend Get Content Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-360, 100]
    },
    {
      "parameters": {
        "jsCode": "const idea = $json;\nif (!idea || !idea.id) throw new Error('contentIdea introuvable.');\nif (!idea.shotstack_render_id) throw new Error('Aucun shotstack_render_id pour cette contentIdea.');\nconst status = String(idea.shotstack_status || '').toLowerCase();\nif (!['queued', 'rendering', 'preparing'].includes(status)) {\n  return [{ json: { skip: true, reason: 'shotstack_status=' + status + ' â€” rien a faire.', idea } }];\n}\nreturn [{ json: { skip: false, renderId: idea.shotstack_render_id, ideaId: idea.id, idea } }];"
      },
      "id": "validate-render",
      "name": "Validate Render State",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-120, 100]
    },
    {
      "parameters": {
        "conditions": {
          "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
          "conditions": [
            { "id": "skip-check", "leftValue": "={{ $json.skip }}", "rightValue": true, "operator": { "type": "boolean", "operation": "equals" } }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "if-skip",
      "name": "Skip if not pending",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [120, 100]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/shotstack/render/' + $json.renderId }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "options": {}
      },
      "id": "shotstack-status",
      "name": "Backend Get Shotstack Status",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [360, 100]
    },
    {
      "parameters": {
        "jsCode": "const status = String($json.response?.status || '').toLowerCase();\nconst ideaId = $('Validate Render State').item.json.ideaId;\nif (status === 'done') {\n  return [{ json: { ideaId, patch: { shotstack_status: 'done', shotstack_url: $json.response?.url || '', final_video_status: 'ready', pipeline_status: 'render_ready' }, callbackStatus: 'SUCCEEDED', callbackMessage: 'Render Shotstack termine.' } }];\n}\nif (status === 'failed') {\n  return [{ json: { ideaId, patch: { shotstack_status: 'failed', final_video_status: 'failed', pipeline_status: 'failed' }, callbackStatus: 'FAILED', callbackMessage: 'Render Shotstack en echec.' } }];\n}\nreturn [];"
      },
      "id": "map-update",
      "name": "Build Update Payload",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [600, 100]
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $json.ideaId }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.patch) }}",
        "options": {}
      },
      "id": "update-row",
      "name": "Backend Update Content Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [840, 100]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackStatus: $('Build Update Payload').item.json.patch.shotstack_status } }}",
        "options": { "responseCode": 200 }
      },
      "id": "respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [1080, 100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/workflow-runs/' + $('Set Input').item.json.workflowRunId + '/complete' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Callback-Secret", "value": "={{ $env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ status: $('Build Update Payload').item.json.callbackStatus, message: $('Build Update Payload').item.json.callbackMessage, responsePayload: JSON.stringify({ contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackStatus: $('Build Update Payload').item.json.patch.shotstack_status }) }) }}",
        "options": {}
      },
      "id": "callback",
      "name": "Callback Backend",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [1320, 100]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, skipped: true, reason: $('Validate Render State').item.json.reason } }}",
        "options": { "responseCode": 200 }
      },
      "id": "respond-skip",
      "name": "Respond Skipped",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [360, 300]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Set Input", "type": "main", "index": 0 }]] },
    "Set Input": { "main": [[{ "node": "Backend Get Content Idea", "type": "main", "index": 0 }]] },
    "Backend Get Content Idea": { "main": [[{ "node": "Validate Render State", "type": "main", "index": 0 }]] },
    "Validate Render State": { "main": [[{ "node": "Skip if not pending", "type": "main", "index": 0 }]] },
    "Skip if not pending": {
      "main": [
        [{ "node": "Respond Skipped", "type": "main", "index": 0 }],
        [{ "node": "Backend Get Shotstack Status", "type": "main", "index": 0 }]
      ]
    },
    "Backend Get Shotstack Status": { "main": [[{ "node": "Build Update Payload", "type": "main", "index": 0 }]] },
    "Build Update Payload": { "main": [[{ "node": "Backend Update Content Idea", "type": "main", "index": 0 }]] },
    "Backend Update Content Idea": { "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]] },
    "Respond to Webhook": { "main": [[{ "node": "Callback Backend", "type": "main", "index": 0 }]] },
    "Callback Backend": { "main": [] }
  },
  "pinData": {},
  "meta": { "templateCredsSetupCompleted": true }
}

```

### docs\n8n-workflows\creation-ideas.json

```json
{
  "name": "creation-ideas",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "creation-ideas",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-1080, 120]
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body || {};\nconst category = String(body.category || '').trim();\nconst ideaCount = Number(body.ideaCount || 1);\nif (!category) throw new Error('category est obligatoire');\nif (!Number.isInteger(ideaCount) || ideaCount < 1 || ideaCount > 5) throw new Error('ideaCount doit etre entre 1 et 5');\nreturn [{ json: { category, ideaCount, workflowRunId: Number(body.workflowRunId || 0), templateId: body.templateId || null, tiktokAccountOpenId: body.tiktokAccountOpenId || null } }];"
      },
      "id": "validate-input",
      "name": "Validate Input",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-820, 120]
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nreturn Array.from({ length: input.ideaCount }).map((_, index) => ({ json: { ...input, iteration: index + 1 } }));"
      },
      "id": "expand",
      "name": "Expand Ideas",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-580, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "Authorization", "value": "={{ 'Bearer ' + $env.GROQ_API_KEY }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { model: 'llama-3.1-8b-instant', messages: [ { role: 'user', content: 'Generate exactly one TikTok content idea for category ' + $json.category + '. Return only the idea text, no numbering, no explanation.' } ] } }}",
        "options": {}
      },
      "id": "groq",
      "name": "HTTP Request Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-340, 120]
    },
    {
      "parameters": {
        "jsCode": "return [{ json: { topic: String($json.choices?.[0]?.message?.content || '').trim(), category: $('Expand Ideas').item.json.category, workflowRunId: $('Expand Ideas').item.json.workflowRunId, templateId: $('Expand Ideas').item.json.templateId, tiktokAccountOpenId: $('Expand Ideas').item.json.tiktokAccountOpenId } }];"
      },
      "id": "normalize",
      "name": "Normalize Topic",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-100, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ category: $json.category, topic: $json.topic, status: 'new', pipelineStatus: 'idea_created', publishStatus: 'draft', platform: 'tiktok', templateId: $json.templateId || null, tiktokAccountOpenId: $json.tiktokAccountOpenId || null }) }}",
        "options": {}
      },
      "id": "create-row",
      "name": "Backend Create Content Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [140, 120]
    },
    {
      "parameters": {
        "jsCode": "const items = $input.all();\nconst workflowRunId = Number($('Validate Input').first().json.workflowRunId || 0);\nreturn [{ json: { workflowRunId, createdCount: items.length } }];"
      },
      "id": "summarize",
      "name": "Summarize",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [380, 120]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, workflowRunId: $('Summarize').item.json.workflowRunId, createdCount: $('Summarize').item.json.createdCount, status: 'idea_created' } }}",
        "options": { "responseCode": 200 }
      },
      "id": "respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [620, 120]
    },
    {
      "parameters": {
        "jsCode": "const http = require('http');\nconst https = require('https');\nconst { URL } = require('url');\nconst baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '');\nconst callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');\nconst workflowRunId = Number($('Summarize').item.json.workflowRunId || 0);\nif (!baseUrl) throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');\nif (!callbackSecret) throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante');\nif (!workflowRunId) throw new Error('workflowRunId manquant');\nconst body = JSON.stringify({ status: 'SUCCEEDED', message: 'Creation ideas terminee.', responsePayload: JSON.stringify({ createdCount: Number($json.createdCount || 0) }) });\nconst url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');\nconst client = url.protocol === 'https:' ? https : http;\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nlet response = null;\nlet lastError = null;\nfor (let attempt = 1; attempt <= 6; attempt += 1) {\n  try {\n    response = await new Promise((resolve, reject) => {\n      const req = client.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Video-Ops-Callback-Secret': callbackSecret } }, (res) => { let data = ''; res.on('data', (chunk) => { data += chunk; }); res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data })); });\n      req.on('error', reject);\n      req.write(body);\n      req.end();\n    });\n    if (response.statusCode >= 200 && response.statusCode < 300) break;\n    lastError = 'Callback backend refuse: ' + response.statusCode;\n    if (response.statusCode !== 404 || attempt === 6) throw new Error(lastError);\n  } catch (error) {\n    lastError = error.message || String(error);\n    if (attempt === 6) throw error;\n  }\n  await sleep(500 * attempt);\n}\nif (!response || response.statusCode < 200 || response.statusCode >= 300) throw new Error(lastError || 'Callback backend refuse.');\nreturn [{ json: { ...$json, callbackStatusCode: response.statusCode } }];"
      },
      "id": "callback",
      "name": "Callback Success",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [860, 120]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Validate Input", "type": "main", "index": 0 }]] },
    "Validate Input": { "main": [[{ "node": "Expand Ideas", "type": "main", "index": 0 }]] },
    "Expand Ideas": { "main": [[{ "node": "HTTP Request Idea", "type": "main", "index": 0 }]] },
    "HTTP Request Idea": { "main": [[{ "node": "Normalize Topic", "type": "main", "index": 0 }]] },
    "Normalize Topic": { "main": [[{ "node": "Backend Create Content Idea", "type": "main", "index": 0 }]] },
    "Backend Create Content Idea": { "main": [[{ "node": "Summarize", "type": "main", "index": 0 }]] },
    "Summarize": { "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]] },
    "Respond to Webhook": { "main": [[{ "node": "Callback Success", "type": "main", "index": 0 }]] },
    "Callback Success": { "main": [] }
  },
  "pinData": {},
  "meta": { "templateCredsSetupCompleted": true }
}

```

### docs\n8n-workflows\init-publish-tiktok-fixed.json

```json
{
  "name": "init-publish-tiktok-fixed",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "init-publish-tiktok",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-1180, 120]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            { "name": "contentIdeaId", "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}", "type": "number" },
            { "name": "workflowRunId", "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}", "type": "number" }
          ]
        },
        "options": {}
      },
      "id": "set-input",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [-940, 120]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $json.contentIdeaId }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "options": {}
      },
      "id": "get-idea",
      "name": "Backend Get Content Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-700, 120]
    },
    {
      "parameters": {
        "jsCode": "const idea = $json;\nif (!idea || !idea.id) throw new Error('contentIdea introuvable.');\nif (idea.platform && idea.platform !== 'tiktok') throw new Error('Cette contentIdea n\\'est pas prevue pour TikTok.');\nif (idea.final_video_status && idea.final_video_status !== 'ready') throw new Error('La video finale n\\'est pas encore prete. Status: ' + idea.final_video_status);\nif (!idea.shotstack_url) throw new Error('La video finale Shotstack est absente.');\nif (idea.publish_status === 'published') throw new Error('Cette video est deja marquee comme publiee.');\nconst openId = idea.tiktok_account_open_id || '';\nif (!openId) throw new Error('Aucun tiktokAccountOpenId n\\'est defini pour cette video.');\nreturn [{ json: { idea, openId } }];"
      },
      "id": "validate-idea",
      "name": "Validate Idea",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-460, 120]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/tiktok-accounts?openId=' + encodeURIComponent($json.openId) }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "options": {}
      },
      "id": "get-account",
      "name": "Backend Get TikTok Account",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-220, 120]
    },
    {
      "parameters": {
        "jsCode": "const accounts = Array.isArray($json) ? $json : [$json];\nconst account = accounts[0];\nif (!account || !account.id) throw new Error('Compte TikTok introuvable pour openId: ' + $(\\'Validate Idea\\').item.json.openId);\nif (!account.refresh_token) throw new Error('refresh_token manquant pour ce compte TikTok.');\nreturn [{ json: { accountId: account.id, openId: account.open_id, refreshToken: account.refresh_token } }];"
      },
      "id": "extract-account",
      "name": "Extract Account",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [20, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://open.tiktokapis.com/v2/oauth/token/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/x-www-form-urlencoded" }
          ]
        },
        "sendBody": true,
        "contentType": "form-urlencoded",
        "bodyParameters": {
          "parameters": [
            { "name": "client_key", "value": "={{ $env.APP_VIDEO_OPS_TIKTOK_CLIENT_KEY }}" },
            { "name": "client_secret", "value": "={{ $env.APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET }}" },
            { "name": "grant_type", "value": "refresh_token" },
            { "name": "refresh_token", "value": "={{ $json.refreshToken }}" }
          ]
        },
        "options": {}
      },
      "id": "refresh-token",
      "name": "HTTP Request Refresh Token",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [260, 120]
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/tiktok-accounts/' + $('Extract Account').item.json.accountId }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ access_token: $json.access_token, refresh_token: $json.refresh_token, open_id: $json.open_id || $('Extract Account').item.json.openId, scope: $json.scope, token_type: $json.token_type }) }}",
        "options": {}
      },
      "id": "update-account",
      "name": "Backend Update TikTok Account",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [500, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json; charset=UTF-8" },
            { "name": "Authorization", "value": "={{ 'Bearer ' + $('HTTP Request Refresh Token').item.json.access_token }}" }
          ]
        },
        "options": {}
      },
      "id": "creator-info",
      "name": "HTTP Request Creator Info",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [740, 120]
    },
    {
      "parameters": {
        "method": "HEAD",
        "url": "={{ $('Backend Get Content Idea').item.json.shotstack_url }}",
        "options": {
          "response": { "response": { "fullResponse": true } }
        }
      },
      "id": "video-head",
      "name": "HTTP Request Video Head",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [980, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://open.tiktokapis.com/v2/post/publish/video/init/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json; charset=UTF-8" },
            { "name": "Authorization", "value": "={{ 'Bearer ' + $('HTTP Request Refresh Token').item.json.access_token }}" }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json; charset=UTF-8",
        "body": "={{ JSON.stringify({ post_info: { title: String($('Backend Get Content Idea').item.json.caption || '').trim().slice(0, 150), privacy_level: ($('HTTP Request Creator Info').item.json.data?.privacy_level_options || ['SELF_ONLY']).includes('SELF_ONLY') ? 'SELF_ONLY' : ($('HTTP Request Creator Info').item.json.data?.privacy_level_options || ['SELF_ONLY'])[0], disable_duet: true, disable_comment: false, disable_stitch: true, video_cover_timestamp_ms: 1000 }, source_info: { source: 'FILE_UPLOAD', video_size: Number($('HTTP Request Video Head').item.json.headers['content-length'] || 0), chunk_size: Number($('HTTP Request Video Head').item.json.headers['content-length'] || 0), total_chunk_count: 1 } }) }}",
        "options": {}
      },
      "id": "init-publish",
      "name": "HTTP Request Init Publish",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [1220, 120]
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $('Backend Get Content Idea').item.json.id }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ tiktok_publish_id: $json.data?.publish_id, tiktok_upload_url: $json.data?.upload_url, tiktok_upload_status: 'init_done', publish_status: 'draft' }) }}",
        "options": {}
      },
      "id": "update-idea",
      "name": "Backend Update Content Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [1460, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/workflow-runs/' + $('Set Input').item.json.workflowRunId + '/complete' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Callback-Secret", "value": "={{ $env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { status: 'SUCCEEDED', message: 'Init publish TikTok termine.', responsePayload: JSON.stringify({ contentIdeaId: $('Backend Get Content Idea').item.json.id, uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url }) } }}",
        "options": {}
      },
      "id": "callback",
      "name": "Callback Success",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [1700, 120]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Backend Get Content Idea').item.json.id, publishId: $('HTTP Request Init Publish').item.json.data?.publish_id, uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url, status: 'init_done' } }}",
        "options": { "responseCode": 200 }
      },
      "id": "respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [1940, 120]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Set Input", "type": "main", "index": 0 }]] },
    "Set Input": { "main": [[{ "node": "Backend Get Content Idea", "type": "main", "index": 0 }]] },
    "Backend Get Content Idea": { "main": [[{ "node": "Validate Idea", "type": "main", "index": 0 }]] },
    "Validate Idea": { "main": [[{ "node": "Backend Get TikTok Account", "type": "main", "index": 0 }]] },
    "Backend Get TikTok Account": { "main": [[{ "node": "Extract Account", "type": "main", "index": 0 }]] },
    "Extract Account": { "main": [[{ "node": "HTTP Request Refresh Token", "type": "main", "index": 0 }]] },
    "HTTP Request Refresh Token": { "main": [[{ "node": "Backend Update TikTok Account", "type": "main", "index": 0 }]] },
    "Backend Update TikTok Account": { "main": [[{ "node": "HTTP Request Creator Info", "type": "main", "index": 0 }]] },
    "HTTP Request Creator Info": { "main": [[{ "node": "HTTP Request Video Head", "type": "main", "index": 0 }]] },
    "HTTP Request Video Head": { "main": [[{ "node": "HTTP Request Init Publish", "type": "main", "index": 0 }]] },
    "HTTP Request Init Publish": { "main": [[{ "node": "Backend Update Content Idea", "type": "main", "index": 0 }]] },
    "Backend Update Content Idea": { "main": [[{ "node": "Callback Success", "type": "main", "index": 0 }]] },
    "Callback Success": { "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]] }
  },
  "pinData": {},
  "meta": { "templateCredsSetupCompleted": true }
}

```

### docs\n8n-workflows\init-publish-tiktok-live-patch.md

```md
# Patch exact pour `init-publish-tiktok` dans ton instance `n8n`

Source de depart:

- workflow reel dans [templaten8n.txt](/c:/TikTok_App/docs/n8n-workflows/templaten8n.txt)

Objectif:

- garder la logique actuelle
- supprimer les secrets et URL backend hardcodes
- reposer sur les variables `n8n`

## Variables `n8n` requises

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## Nodes a modifier

Tu n as besoin de modifier que 2 nodes:

1. `HTTP Request Init Publish Context`
2. `Build Callback Auth`

Le reste peut rester tel quel.

## 1. Node `HTTP Request Init Publish Context`

### Champ `URL`

Remplace:

```text
https://endurable-defiling-bleak.ngrok-free.dev/api/video-ops/internal/tiktok/init-publish-context
```

Par:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/tiktok/init-publish-context' }}
```

### Header `X-Video-Ops-Internal-Secret`

Remplace:

```text
video-ops-internal-2026-very-secret-1
```

Par:

```text
={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

### Champ `JSON Body`

Tu peux garder ton body actuel, ou le normaliser comme ceci:

```json
={{ { contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0) } }}
```

## 2. Node `Build Callback Auth`

Remplace tout le contenu `jsCode` actuel par ceci:

```javascript
const crypto = require('crypto');

const backendBaseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '');
const hmacSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET || '');
const workflowRunId = Number($('Set Input').item.json.workflowRunId || 0);

if (!backendBaseUrl) {
  throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');
}

if (!hmacSecret) {
  throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET manquante');
}

if (!workflowRunId) {
  throw new Error('workflowRunId manquant');
}

const requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;
const callbackUrl = `${backendBaseUrl}${requestPath}`;
const callbackTimestamp = new Date().toISOString();

const callbackBodyObject = {
  status: 'SUCCEEDED',
  message: 'Init publish TikTok termine.',
  responsePayload: JSON.stringify({
    contentIdeaId: $('Supabase Get Content Idea').item.json.id,
    uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || '',
  }),
};

const callbackBody = JSON.stringify(callbackBodyObject);
const payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');
const canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\n');
const callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');

return [{
  json: {
    callbackUrl,
    callbackTimestamp,
    callbackSignature,
    callbackBody,
  }
}];
```

## 3. Node `Callback Success`

La config est deja presque bonne. Verifie juste ces valeurs:

### URL

```text
={{ $json.callbackUrl }}
```

### Headers

```text
Content-Type: application/json
X-Video-Ops-Callback-Timestamp: {{ $json.callbackTimestamp }}
X-Video-Ops-Callback-Signature: {{ $json.callbackSignature }}
```

### Body

```text
={{ $json.callbackBody }}
```

Note:

dans ton export actuel, le champ URL contient une fin de ligne parasite:

```text
={{ $json.callbackUrl }}\n
```

Le plus propre est de le remettre exactement a:

```text
={{ $json.callbackUrl }}
```

## 4. Ce que tu peux verifier juste apres

Quand tu relances `init-publish-tiktok`:

- le node `HTTP Request Init Publish Context` repond `200`
- le node `Build Callback Auth` ne leve pas d erreur sur les variables manquantes
- le node `Callback Success` repond `200`
- le backend marque le `workflowRunId` en `SUCCEEDED`

## 5. Resultat attendu

Apres ce patch:

- plus d URL backend `ngrok` hardcodee dans le workflow
- plus de secret interne hardcode
- plus de secret HMAC hardcode
- la logique `init-publish` reste identique

## 6. Etape suivante recommandee

Une fois `init-publish-tiktok` corrige dans ton instance `n8n`, applique le meme principe aux autres workflows:

- `script-generation`
- `creation-ideas`
- `render-template-video`
- `check-shotstack-status`

```

### docs\n8n-workflows\README.md

```md
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

```

### docs\n8n-workflows\render-template-video-with-callback.json

```json
{
  "name": "render-template-video-with-callback",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "render-template-video",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-980, 100]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            { "name": "contentIdeaId", "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}", "type": "number" },
            { "name": "topic", "value": "={{ String($json.body.topic || $json.topic || '').trim() }}", "type": "string" },
            { "name": "script", "value": "={{ String($json.body.script || $json.script || '').trim() }}", "type": "string" },
            { "name": "caption", "value": "={{ String($json.body.caption || $json.caption || '').trim() }}", "type": "string" },
            { "name": "keyword", "value": "={{ String($json.body.keyword || $json.keyword || '').trim() }}", "type": "string" },
            { "name": "workflowRunId", "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}", "type": "number" }
          ]
        },
        "options": {}
      },
      "id": "set-input",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [-740, 100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "Authorization", "value": "={{ 'Bearer ' + $env.GROQ_API_KEY }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [ { role: 'user', content: 'Create one realistic visual prompt for a vertical TikTok business video about this topic: ' + $json.topic + '. Script: ' + $json.script + '. Keyword: ' + ($json.keyword || $json.topic) + '. One sentence only.' } ] }) }}",
        "options": {}
      },
      "id": "groq-prompt",
      "name": "HTTP Request Image Prompt",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-500, 100]
    },
    {
      "parameters": {
        "url": "={{ (() => { const raw = String($('Set Input').item.json.keyword || $('Set Input').item.json.topic || 'business'); const normalized = raw.replace(/[\"'&]/g, ' ').replace(/[^\\w\\s-]/g, ' ').replace(/\\s+/g, ' ').trim(); const query = (normalized || 'business').split(' ').slice(0, 4).join(' ') || 'business'; return 'https://api.pexels.com/videos/search?query=' + encodeURIComponent(query) + '&per_page=5&orientation=portrait'; })() }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Authorization", "value": "={{ $env.PEXELS_API_KEY }}" }
          ]
        },
        "options": {}
      },
      "id": "pexels",
      "name": "HTTP Request Pexels",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-260, 100]
    },
    {
      "parameters": {
        "jsCode": "const videos = $json.videos || [];\nif (!videos.length) throw new Error('Aucune video Pexels retournee');\nconst preferred = [];\nconst fallback = [];\nfor (const video of videos) {\n  for (const file of video.video_files || []) {\n    if (!file?.link || file.file_type !== 'video/mp4') continue;\n    const width = Number(file.width || video.width || 0);\n    const height = Number(file.height || video.height || 0);\n    if (!width || !height || height <= width) continue;\n    const item = { link: file.link, width, height };\n    if ((width === 1080 && height === 1920) || (width === 720 && height === 1280) || (width === 540 && height === 960)) { preferred.push(item); } else { fallback.push(item); }\n  }\n}\nconst pick = (preferred[0] || fallback.sort((a, b) => (b.height * b.width) - (a.height * a.width))[0]);\nif (!pick) throw new Error('Aucune video portrait exploitable retournee par Pexels');\nreturn [{ json: { id: $('Set Input').item.json.contentIdeaId, workflowRunId: $('Set Input').item.json.workflowRunId, topic: $('Set Input').item.json.topic, scripts: $('Set Input').item.json.script, caption: $('Set Input').item.json.caption, image_prompt: String($('HTTP Request Image Prompt').item.json.choices?.[0]?.message?.content || '').trim(), background_video_url: pick.link } }];"
      },
      "id": "select-media",
      "name": "Select Portrait Media",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-20, 100]
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $json.id }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ shotstack_status: 'preparing', final_video_status: 'processing', render_payload: JSON.stringify($json), render_status: 'prepared', pipeline_status: 'rendering_requested' }) }}",
        "options": {}
      },
      "id": "update-preparing",
      "name": "Backend Update Preparing",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [220, 100]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/shotstack/render' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify((() => { const cleanText = (value) => String(value || '').normalize('NFKD').replace(/[^\\x20-\\x7E]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 120); const lines = String($json.scripts || '').split('\\n').map((line) => cleanText(line)).filter(Boolean); const fallbackTopic = cleanText($('Set Input').item.json.topic || 'Video business'); const textLines = (lines.length ? lines : [fallbackTopic]).slice(0, 3); const titleClips = textLines.filter(Boolean).map((line, index) => ({ asset: { type: 'title', text: line, style: 'minimal', color: '#ffffff', background: 'rgba(15,15,15,0.55)' }, start: index * 3, length: 3, position: 'center' })); return { timeline: { background: '#0f0f0f', tracks: [ { clips: [ { asset: { type: 'video', src: $json.background_video_url }, start: 0, length: 15, fit: 'cover' } ] }, ...(titleClips.length ? [{ clips: titleClips }] : []) ] }, output: { format: 'mp4', aspectRatio: '9:16', resolution: 'hd' } }; })()) }}",
        "options": {}
      },
      "id": "shotstack-render",
      "name": "HTTP Request Shotstack Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [460, 100]
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $('Select Portrait Media').item.json.id }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ shotstack_render_id: $json.response?.id || $json.id, shotstack_status: 'queued', final_video_status: 'processing', pipeline_status: 'rendering_requested' }) }}",
        "options": {}
      },
      "id": "update-render-id",
      "name": "Backend Update Render Id",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [700, 100]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackRenderId: $('HTTP Request Shotstack Render').item.json.response?.id || $('HTTP Request Shotstack Render').item.json.id, status: 'render_requested' } }}",
        "options": { "responseCode": 200 }
      },
      "id": "respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [940, 100]
    },
    {
      "parameters": {
        "jsCode": "const http = require('http');\nconst https = require('https');\nconst { URL } = require('url');\nconst baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '');\nconst callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');\nconst workflowRunId = Number($('Set Input').item.json.workflowRunId || 0);\nif (!baseUrl) throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');\nif (!callbackSecret) throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante');\nif (!workflowRunId) throw new Error('workflowRunId manquant');\nconst body = JSON.stringify({ status: 'SUCCEEDED', message: 'Render Shotstack demande.', responsePayload: JSON.stringify({ contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0), shotstackRenderId: $('HTTP Request Shotstack Render').item.json.response?.id || $('HTTP Request Shotstack Render').item.json.id || '' }) });\nconst url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');\nconst client = url.protocol === 'https:' ? https : http;\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nlet response = null;\nlet lastError = null;\nfor (let attempt = 1; attempt <= 6; attempt += 1) {\n  try {\n    response = await new Promise((resolve, reject) => {\n      const req = client.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Video-Ops-Callback-Secret': callbackSecret } }, (res) => { let data = ''; res.on('data', (chunk) => { data += chunk; }); res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data })); });\n      req.on('error', reject);\n      req.write(body);\n      req.end();\n    });\n    if (response.statusCode >= 200 && response.statusCode < 300) break;\n    lastError = 'Callback backend refuse: ' + response.statusCode;\n    if (response.statusCode !== 404 || attempt === 6) throw new Error(lastError);\n  } catch (error) {\n    lastError = error.message || String(error);\n    if (attempt === 6) throw error;\n  }\n  await sleep(500 * attempt);\n}\nif (!response || response.statusCode < 200 || response.statusCode >= 300) throw new Error(lastError || 'Callback backend refuse.');\nreturn [{ json: { ...$json, callbackStatusCode: response.statusCode } }];"
      },
      "id": "callback",
      "name": "Callback Success",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1180, 100]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Set Input", "type": "main", "index": 0 }]] },
    "Set Input": { "main": [[{ "node": "HTTP Request Image Prompt", "type": "main", "index": 0 }]] },
    "HTTP Request Image Prompt": { "main": [[{ "node": "HTTP Request Pexels", "type": "main", "index": 0 }]] },
    "HTTP Request Pexels": { "main": [[{ "node": "Select Portrait Media", "type": "main", "index": 0 }]] },
    "Select Portrait Media": { "main": [[{ "node": "Backend Update Preparing", "type": "main", "index": 0 }]] },
    "Backend Update Preparing": { "main": [[{ "node": "HTTP Request Shotstack Render", "type": "main", "index": 0 }]] },
    "HTTP Request Shotstack Render": { "main": [[{ "node": "Backend Update Render Id", "type": "main", "index": 0 }]] },
    "Backend Update Render Id": { "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]] },
    "Respond to Webhook": { "main": [[{ "node": "Callback Success", "type": "main", "index": 0 }]] },
    "Callback Success": { "main": [] }
  },
  "pinData": {},
  "meta": { "templateCredsSetupCompleted": true }
}

```

### docs\n8n-workflows\script-generation-single-llm.json

```json
{
  "name": "script-generation-single-llm",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "script-generation",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-script",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-840, 120]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            { "name": "contentIdeaId", "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}", "type": "number" },
            { "name": "topic", "value": "={{ String($json.body.topic || $json.topic || '').trim() }}", "type": "string" },
            { "name": "category", "value": "={{ String($json.body.category || $json.category || '').trim() }}", "type": "string" },
            { "name": "workflowRunId", "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}", "type": "number" }
          ]
        },
        "options": {}
      },
      "id": "set-input",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [-600, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "Authorization", "value": "={{ 'Bearer ' + $env.GROQ_API_KEY }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.7, messages: [ { role: 'system', content: 'Tu generes du contenu TikTok. Retourne uniquement un JSON valide avec les cles script, caption, background_keyword.' }, { role: 'user', content: 'Categorie: ' + $json.category + '\\nTopic: ' + $json.topic + '\\nContraintes:\\n- script: francais, naturel, court, pret pour une video TikTok\\n- caption: concise avec hashtags\\n- background_keyword: un seul mot-cle visuel exploitable\\nRetourne uniquement le JSON.' } ] }) }}",
        "options": {}
      },
      "id": "http-groq",
      "name": "HTTP Request Groq",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-320, 120]
    },
    {
      "parameters": {
        "jsCode": "const raw = String($json.choices?.[0]?.message?.content || '').trim();\nconst cleaned = raw.replace(/^```json\\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();\nlet parsed;\ntry { parsed = JSON.parse(cleaned); } catch (error) { throw new Error('Reponse LLM non parseable en JSON: ' + cleaned); }\nreturn [{ json: { contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0), workflowRunId: Number($('Set Input').item.json.workflowRunId || 0), script: String(parsed.script || '').trim(), caption: String(parsed.caption || '').trim(), background_keyword: String(parsed.background_keyword || '').trim() } }];"
      },
      "id": "code-parse",
      "name": "Parse JSON",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-40, 120]
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $json.contentIdeaId }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Video-Ops-Internal-Secret", "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ scripts: $json.script, script_status: 'done', caption: $json.caption, background_keyword: $json.background_keyword, pipeline_status: 'script_ready' }) }}",
        "options": {}
      },
      "id": "backend-update",
      "name": "Backend Update Script",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [240, 120]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Parse JSON').item.json.contentIdeaId, workflowRunId: $('Parse JSON').item.json.workflowRunId, status: 'script_ready' } }}",
        "options": { "responseCode": 200 }
      },
      "id": "respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [480, 120]
    },
    {
      "parameters": {
        "jsCode": "const http = require('http');\nconst https = require('https');\nconst { URL } = require('url');\nconst baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '');\nconst callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');\nconst workflowRunId = Number($('Parse JSON').item.json.workflowRunId || 0);\nif (!baseUrl) throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');\nif (!callbackSecret) throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante');\nif (!workflowRunId) throw new Error('workflowRunId manquant');\nconst body = JSON.stringify({ status: 'SUCCEEDED', message: 'Script workflow termine.', responsePayload: JSON.stringify({ contentIdeaId: Number($('Parse JSON').item.json.contentIdeaId || 0) }) });\nconst url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');\nconst client = url.protocol === 'https:' ? https : http;\nconst sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nlet response = null;\nlet lastError = null;\nfor (let attempt = 1; attempt <= 6; attempt += 1) {\n  try {\n    response = await new Promise((resolve, reject) => {\n      const req = client.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Video-Ops-Callback-Secret': callbackSecret } }, (res) => { let data = ''; res.on('data', (chunk) => { data += chunk; }); res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data })); });\n      req.on('error', reject);\n      req.write(body);\n      req.end();\n    });\n    if (response.statusCode >= 200 && response.statusCode < 300) break;\n    lastError = 'Callback backend refuse: ' + response.statusCode;\n    if (response.statusCode !== 404 || attempt === 6) throw new Error(lastError);\n  } catch (error) {\n    lastError = error.message || String(error);\n    if (attempt === 6) throw error;\n  }\n  await sleep(500 * attempt);\n}\nif (!response || response.statusCode < 200 || response.statusCode >= 300) throw new Error(lastError || 'Callback backend refuse.');\nreturn [{ json: { ...$json, callbackStatusCode: response.statusCode } }];"
      },
      "id": "callback-success",
      "name": "Callback Success",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [720, 120]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Set Input", "type": "main", "index": 0 }]] },
    "Set Input": { "main": [[{ "node": "HTTP Request Groq", "type": "main", "index": 0 }]] },
    "HTTP Request Groq": { "main": [[{ "node": "Parse JSON", "type": "main", "index": 0 }]] },
    "Parse JSON": { "main": [[{ "node": "Backend Update Script", "type": "main", "index": 0 }]] },
    "Backend Update Script": { "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]] },
    "Respond to Webhook": { "main": [[{ "node": "Callback Success", "type": "main", "index": 0 }]] },
    "Callback Success": { "main": [] }
  },
  "pinData": {},
  "meta": { "templateCredsSetupCompleted": true }
}

```

### docs\n8n-workflows\templaten8n.txt

```text
/// init-publish-tiktok
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "init-publish-tiktok",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "61b9e6fd-deef-46b6-8878-d70e27f2285e",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        1040,
        144
      ],
      "webhookId": "d22c7811-ab9b-4744-a66b-5d9587cf23dd"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "name": "contentIdeaId",
              "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
              "type": "number"
            },
            {
              "name": "workflowRunId",
              "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
              "type": "number"
            }
          ]
        },
        "options": {}
      },
      "id": "fda87646-13d4-447f-88b9-ce731451f8a5",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        1280,
        144
      ]
    },
    {
      "parameters": {
        "operation": "getAll",
        "tableId": "content_ideas",
        "limit": 1,
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "id",
              "condition": "eq",
              "keyValue": "={{ $json.contentIdeaId }}"
            },
            {
              "keyName": "platform",
              "condition": "eq",
              "keyValue": "tiktok"
            },
            {
              "keyName": "final_video_status",
              "condition": "eq",
              "keyValue": "ready"
            }
          ]
        }
      },
      "id": "187eb803-b678-4f46-a363-7b1181ca5f21",
      "name": "Supabase Get Content Idea",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1520,
        144
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "method": "HEAD",
        "url": "={{ $('HTTP Request Init Publish Context').item.json.shotstackUrl }}",
        "options": {
          "response": {
            "response": {
              "fullResponse": true
            }
          }
        }
      },
      "id": "5d360b4d-6ad2-4429-a2ec-77d9a4db384c",
      "name": "HTTP Request Video Head",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        2032,
        144
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://open.tiktokapis.com/v2/post/publish/video/init/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json; charset=UTF-8"
            },
            {
              "name": "Authorization",
              "value": "={{ 'Bearer ' + $('HTTP Request Init Publish Context').item.json.accessToken }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({\n  post_info: {\n    title: String($('HTTP Request Init Publish Context').item.json.title || '').trim().slice(0, 150),\n    privacy_level: $('HTTP Request Init Publish Context').item.json.selectedPrivacyLevel || 'SELF_ONLY',\n    disable_duet: true,\n    disable_comment: false,\n    disable_stitch: true,\n    video_cover_timestamp_ms: 1000\n  },\n  source_info: {\n    source: 'FILE_UPLOAD',\n    video_size: Number($('HTTP Request Video Head').item.json.headers['content-length'] || 0),\n    chunk_size: Number($('HTTP Request Video Head').item.json.headers['content-length'] || 0),\n    total_chunk_count: 1\n  }\n}) }}\n",
        "options": {}
      },
      "id": "5e0f81ab-ed1f-49c1-aab6-3a9337c2ea6d",
      "name": "HTTP Request Init Publish",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        2272,
        144
      ]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "content_ideas",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "id",
              "condition": "eq",
              "keyValue": "={{ $('Supabase Get Content Idea').item.json.id }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "tiktok_publish_id",
              "fieldValue": "={{ $json.data?.publish_id }}"
            },
            {
              "fieldId": "tiktok_upload_url",
              "fieldValue": "={{ $json.data?.upload_url }}"
            },
            {
              "fieldId": "tiktok_upload_status",
              "fieldValue": "init_done"
            },
            {
              "fieldId": "publish_status",
              "fieldValue": "draft"
            }
          ]
        }
      },
      "id": "25416d07-6285-49ec-a80d-cc8b86ae41be",
      "name": "Supabase Update Content Idea",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        2512,
        144
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.callbackUrl }}\n",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-Video-Ops-Callback-Timestamp",
              "value": "={{ $json.callbackTimestamp }}"
            },
            {
              "name": "X-Video-Ops-Callback-Signature",
              "value": "={{ $json.callbackSignature }}"
            }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={{ $json.callbackBody }}",
        "options": {}
      },
      "id": "b523ceb8-e157-499f-9338-8a2c6c09c743",
      "name": "Callback Success",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        2960,
        144
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Supabase Get Content Idea').item.json.id, publishId: $('HTTP Request Init Publish').item.json.data?.publish_id, uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url, status: 'init_done' } }}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "c3a4e71d-ea44-48fd-aaf6-b7fdc7ac4ca8",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        3200,
        144
      ]
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\n\nconst backendBaseUrl = 'https://endurable-defiling-bleak.ngrok-free.dev'.replace(/\\/+$/, '');\nconst hmacSecret = 'video-ops-hmac-2026-super-secret-8f4k29x7p1m';\nconst workflowRunId = Number($('Set Input').item.json.workflowRunId || 0);\n\nif (!workflowRunId) {\n  throw new Error('workflowRunId manquant');\n}\n\nconst requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;\nconst callbackUrl = `${backendBaseUrl}${requestPath}`;\nconst callbackTimestamp = new Date().toISOString();\n\nconst callbackBodyObject = {\n  status: 'SUCCEEDED',\n  message: 'Init publish TikTok termine.'\n};\n\nconst callbackBody = JSON.stringify(callbackBodyObject);\nconst payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');\nconst canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\\n');\nconst callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');\n\nreturn [{\n  json: {\n    callbackUrl,\n    callbackTimestamp,\n    callbackSignature,\n    callbackBody\n  }\n}];\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2720,
        144
      ],
      "id": "f08305d6-1430-4670-ac40-9f0821c5e46f",
      "name": "Build Callback Auth"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://endurable-defiling-bleak.ngrok-free.dev/api/video-ops/internal/tiktok/init-publish-context",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-Video-Ops-Internal-Secret",
              "value": "video-ops-internal-2026-very-secret-1"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"contentIdeaId\": {{ Number($('Set Input').item.json.contentIdeaId) }}\n}\n",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        1776,
        144
      ],
      "id": "7d23fe6f-a116-4e04-9007-b5c58aca60fe",
      "name": "HTTP Request Init Publish Context"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Set Input",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Input": {
      "main": [
        [
          {
            "node": "Supabase Get Content Idea",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Get Content Idea": {
      "main": [
        [
          {
            "node": "HTTP Request Init Publish Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Video Head": {
      "main": [
        [
          {
            "node": "HTTP Request Init Publish",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Init Publish": {
      "main": [
        [
          {
            "node": "Supabase Update Content Idea",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Update Content Idea": {
      "main": [
        [
          {
            "node": "Build Callback Auth",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Callback Success": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Callback Auth": {
      "main": [
        [
          {
            "node": "Callback Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Init Publish Context": {
      "main": [
        [
          {
            "node": "HTTP Request Video Head",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "03f0bb40bc4d36fe4b86ff52e36f070cd89e1231b2f6d95f96b904abddbfaa85"
  }
}





/// check-shotstack-status
{
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 1
            }
          ]
        }
      },
      "id": "0fd487bb-387a-4b44-b4dc-6facc11f6150",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.3,
      "position": [
        0,
        0
      ]
    },
    {
      "parameters": {
        "operation": "getAll",
        "tableId": "content_ideas",
        "filters": {
          "conditions": [
            {
              "keyName": "shotstack_render_id",
              "condition": "neq",
              "keyValue": "null"
            },
            {
              "keyName": "final_video_status",
              "condition": "eq",
              "keyValue": "processing"
            }
          ]
        }
      },
      "id": "2f346b0a-3839-4217-b232-8bef31daaca8",
      "name": "Supabase Get Pending Renders",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        240,
        0
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "return $input.all().filter(item => ['queued', 'rendering', 'preparing'].includes(String(item.json.shotstack_status || '').toLowerCase()));"
      },
      "id": "b4d9aaff-f588-4686-9339-1efd32c4f794",
      "name": "Filter Valid Status",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        480,
        0
      ],
      "alwaysOutputData": false
    },
    {
      "parameters": {
        "url": "={{ 'https://api.shotstack.io/v1/render/' + String($json.shotstack_render_id || '').trim() }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "=hIUXf7D9Pc5G3zjpT6wt3JeLmljX7DfJn6n13QS1"
            }
          ]
        },
        "options": {}
      },
      "id": "d97facff-e099-4202-a485-b8e87b127226",
      "name": "HTTP Request Shotstack Status",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        720,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const status = String($json.response?.status || '').toLowerCase();\nconst base = $('Filter Valid Status').item.json;\nif (status === 'done') {\n  return [{ json: { id: base.id, shotstack_status: 'done', shotstack_url: $json.response?.url || '', final_video_status: 'ready', pipeline_status: 'render_ready' } }];\n}\nif (status === 'failed') {\n  return [{ json: { id: base.id, shotstack_status: 'failed', final_video_status: 'failed', pipeline_status: 'failed' } }];\n}\nreturn [];"
      },
      "id": "854e3008-4613-4925-8859-cb10ce80da95",
      "name": "Build Update Payload",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        960,
        0
      ]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "content_ideas",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "id",
              "condition": "eq",
              "keyValue": "={{ $json.id }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "shotstack_status",
              "fieldValue": "={{ $json.shotstack_status }}"
            },
            {
              "fieldId": "shotstack_url",
              "fieldValue": "={{ $json.shotstack_url || '' }}"
            },
            {
              "fieldId": "final_video_status",
              "fieldValue": "={{ $json.final_video_status }}"
            },
            {
              "fieldId": "pipeline_status",
              "fieldValue": "={{ $json.pipeline_status }}"
            }
          ]
        }
      },
      "id": "02d1dc13-1446-4fcd-b9b0-a9ab5bc304bb",
      "name": "Supabase Update Row",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1200,
        0
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Supabase Get Pending Renders",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Get Pending Renders": {
      "main": [
        [
          {
            "node": "Filter Valid Status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filter Valid Status": {
      "main": [
        [
          {
            "node": "HTTP Request Shotstack Status",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Shotstack Status": {
      "main": [
        [
          {
            "node": "Build Update Payload",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Update Payload": {
      "main": [
        [
          {
            "node": "Supabase Update Row",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "03f0bb40bc4d36fe4b86ff52e36f070cd89e1231b2f6d95f96b904abddbfaa85"
  }
}
/// script-generation
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "script-generation",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "eaf297de-df7c-4804-8683-2fae44e139ce",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        0,
        0
      ],
      "webhookId": "2cd7466a-dcd4-4473-ab2a-21feb3c54b63"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "name": "contentIdeaId",
              "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
              "type": "number"
            },
            {
              "name": "topic",
              "value": "={{ String($json.body.topic || $json.topic || '').trim() }}",
              "type": "string"
            },
            {
              "name": "category",
              "value": "={{ String($json.body.category || $json.category || '').trim() }}",
              "type": "string"
            },
            {
              "name": "workflowRunId",
              "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
              "type": "number"
            }
          ]
        },
        "options": {}
      },
      "id": "e97f8e6e-087b-48bb-ab74-f63261ef0fd7",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        240,
        0
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Authorization",
              "value": "=Bearer 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"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.7, messages: [ { role: 'system', content: 'Tu generes du contenu TikTok. Retourne uniquement un JSON valide avec les cles script, caption, background_keyword.' }, { role: 'user', content: 'Categorie: ' + $json.category + '\\nTopic: ' + $json.topic + '\\nContraintes:\\n- script: francais, naturel, court, pret pour une video TikTok\\n- caption: concise avec hashtags\\n- background_keyword: un seul mot-cle visuel exploitable\\nRetourne uniquement le JSON.' } ] }) }}",
        "options": {}
      },
      "id": "4af0d0c4-7891-43ec-94a1-1807984709c2",
      "name": "HTTP Request Groq",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        528,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const raw = String($json.choices?.[0]?.message?.content || '').trim();\nconst cleaned = raw.replace(/^```json\\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();\nlet parsed;\ntry {\n  parsed = JSON.parse(cleaned);\n} catch (error) {\n  throw new Error('Reponse LLM non parseable en JSON: ' + cleaned);\n}\nreturn [{ json: {\n  contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0),\n  workflowRunId: Number($('Set Input').item.json.workflowRunId || 0),\n  script: String(parsed.script || '').trim(),\n  caption: String(parsed.caption || '').trim(),\n  background_keyword: String(parsed.background_keyword || '').trim()\n}}];"
      },
      "id": "8ef2aab5-8891-4c87-8390-ad0913491a28",
      "name": "Parse JSON",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        800,
        0
      ]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "content_ideas",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "id",
              "condition": "eq",
              "keyValue": "={{ $json.contentIdeaId }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "scripts",
              "fieldValue": "={{ $json.script }}"
            },
            {
              "fieldId": "script_status",
              "fieldValue": "done"
            },
            {
              "fieldId": "caption",
              "fieldValue": "={{ $json.caption }}"
            },
            {
              "fieldId": "background_keyword",
              "fieldValue": "={{ $json.background_keyword }}"
            },
            {
              "fieldId": "pipeline_status",
              "fieldValue": "script_ready"
            }
          ]
        }
      },
      "id": "dc05a34f-e48a-4e40-bf44-e6cab44284af",
      "name": "Supabase Update",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1088,
        0
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.callbackUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-Video-Ops-Callback-Timestamp",
              "value": "={{ $json.callbackTimestamp }}"
            },
            {
              "name": "X-Video-Ops-Callback-Signature",
              "value": "={{ $json.callbackSignature }}"
            }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={{ $json.callbackBody }}",
        "options": {}
      },
      "id": "e72819c8-307c-4368-9b7d-21f91c37f2cf",
      "name": "Callback Success",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        1568,
        0
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $json.contentIdeaId, workflowRunId: $json.workflowRunId, status: 'script_ready' } }}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "b6e07b2c-4af5-422a-a336-cefb7ca2d6a6",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        1840,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\n\nconst backendBaseUrl = 'https://endurable-defiling-bleak.ngrok-free.dev'.replace(/\\/+$/, '');\nconst hmacSecret = 'video-ops-hmac-2026-super-secret-8f4k29x7p1m';\nconst workflowRunId = Number($('Set Input').item.json.workflowRunId || 0);\n\nif (!workflowRunId) {\n  throw new Error('workflowRunId manquant');\n}\n\nconst requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;\nconst callbackUrl = `${backendBaseUrl}${requestPath}`;\nconst callbackTimestamp = new Date().toISOString();\n\nconst callbackBodyObject = {\n  status: 'SUCCEEDED',\n  message: 'Script workflow termine.'\n};\n\nconst callbackBody = JSON.stringify(callbackBodyObject);\nconst payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');\nconst canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\\n');\nconst callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');\n\nreturn [{\n  json: {\n    callbackUrl,\n    callbackTimestamp,\n    callbackSignature,\n    callbackBody\n  }\n}];\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1328,
        0
      ],
      "id": "8c0bdc2e-fb84-43bf-9655-180f86a0b9ef",
      "name": "Build Callback Auth"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Set Input",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Input": {
      "main": [
        [
          {
            "node": "HTTP Request Groq",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Groq": {
      "main": [
        [
          {
            "node": "Parse JSON",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse JSON": {
      "main": [
        [
          {
            "node": "Supabase Update",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Update": {
      "main": [
        [
          {
            "node": "Build Callback Auth",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Callback Success": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Callback Auth": {
      "main": [
        [
          {
            "node": "Callback Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {
    "Webhook": [
      {
        "headers": {
          "host": "youssefnaib6.app.n8n.cloud",
          "user-agent": "Java-http-client/17.0.18",
          "content-length": "472",
          "accept-encoding": "gzip, br",
          "cdn-loop": "cloudflare; loops=1; subreqs=1",
          "cf-connecting-ip": "196.115.18.84",
          "cf-ew-via": "15",
          "cf-ipcountry": "MA",
          "cf-ray": "9f3f6cdf5d99e2c2-MAD",
          "cf-visitor": "{\"scheme\":\"https\"}",
          "cf-worker": "n8n.cloud",
          "content-type": "application/json",
          "x-forwarded-for": "196.115.18.84, 162.158.122.172",
          "x-forwarded-host": "youssefnaib6.app.n8n.cloud",
          "x-forwarded-port": "443",
          "x-forwarded-proto": "https",
          "x-forwarded-server": "traefik-prod-users-gwc-52-84768ff5b-bt9h2",
          "x-is-trusted": "yes",
          "x-real-ip": "196.115.18.84"
        },
        "params": {},
        "query": {},
        "body": {
          "contentIdeaId": 263,
          "category": null,
          "ideaCount": 1,
          "topic": "\"Ambitious Home Cook Tries Recipe from a Michelin Star Chef with Hilarious, Cringeworthy, and Deliciously Funny Results\"",
          "script": null,
          "caption": null,
          "keyword": null,
          "tiktokAccountOpenId": null,
          "source": "backoffice-tiktok-step-script",
          "force": false,
          "requestedBy": "admin@tiktokapp.local",
          "requestedAt": "2026-04-29T15:43:56.952387173Z",
          "workflowRunId": 329,
          "attemptNumber": 1,
          "idempotencyKey": "CHECK_SHOTSTACK:263"
        },
        "webhookUrl": "https://youssefnaib6.app.n8n.cloud/webhook/script-generation",
        "executionMode": "production"
      }
    ]
  },
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "03f0bb40bc4d36fe4b86ff52e36f070cd89e1231b2f6d95f96b904abddbfaa85"
  }
}
/// creation-ideas
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "creation-ideas",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "034e4c37-d7ed-49f0-af04-789c3bfbb5d0",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        0,
        0
      ],
      "webhookId": "0489447d-c240-4df8-bb6e-0da09f7614a8"
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body || {};\nconst category = String(body.category || '').trim();\nconst ideaCount = Number(body.ideaCount || 1);\nif (!category) throw new Error('category est obligatoire');\nif (!Number.isInteger(ideaCount) || ideaCount < 1 || ideaCount > 5) throw new Error('ideaCount doit etre entre 1 et 5');\nreturn [{ json: { category, ideaCount, workflowRunId: Number(body.workflowRunId || 0), template_id: body.templateId || null, tiktok_account_open_id: body.tiktokAccountOpenId || null } }];"
      },
      "id": "08e08839-848c-4ac6-b964-67701ffc53ba",
      "name": "Validate Input",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        272,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nreturn Array.from({ length: input.ideaCount }).map((_, index) => ({ json: { ...input, iteration: index + 1 } }));"
      },
      "id": "e0e75016-1a4d-4a85-83a3-4e5820d626e3",
      "name": "Expand Ideas",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        512,
        0
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Authorization",
              "value": "=Bearer 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"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { model: 'llama-3.1-8b-instant', messages: [ { role: 'user', content: 'Generate exactly one TikTok content idea for category ' + $json.category + '. Return only the idea text, no numbering, no explanation.' } ] } }}",
        "options": {}
      },
      "id": "42614c39-100b-4b78-8225-ec15e029a543",
      "name": "HTTP Request Idea",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        752,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "return [{ json: { topic: String($json.choices?.[0]?.message?.content || '').trim(), category: $('Expand Ideas').item.json.category, workflowRunId: $('Expand Ideas').item.json.workflowRunId, template_id: $('Expand Ideas').item.json.template_id, tiktok_account_open_id: $('Expand Ideas').item.json.tiktok_account_open_id } }];"
      },
      "id": "2ff8a2d5-2241-465e-a314-b5964f017174",
      "name": "Normalize Topic",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        992,
        0
      ]
    },
    {
      "parameters": {
        "tableId": "content_ideas",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "status",
              "fieldValue": "new"
            },
            {
              "fieldId": "topic",
              "fieldValue": "={{ $json.topic }}"
            },
            {
              "fieldId": "pipeline_status",
              "fieldValue": "idea_created"
            },
            {
              "fieldId": "publish_status",
              "fieldValue": "draft"
            },
            {
              "fieldId": "platform",
              "fieldValue": "tiktok"
            },
            {
              "fieldId": "template_id",
              "fieldValue": "={{ $json.template_id }}"
            },
            {
              "fieldId": "tiktok_account_open_id",
              "fieldValue": "={{ $json.tiktok_account_open_id }}"
            },
            {
              "fieldId": "category",
              "fieldValue": "={{ $json.category }}"
            }
          ]
        }
      },
      "id": "ac68e5bb-7834-46e8-9a86-76f8d7043659",
      "name": "Supabase Create Row",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1232,
        0
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const items = $input.all();\nconst workflowRunId = Number($('Validate Input').first().json.workflowRunId || 0);\n\nreturn [{\n  json: {\n    workflowRunId,\n    createdCount: items.length\n  }\n}];\n"
      },
      "id": "50b5e1cb-6065-4d48-bb9a-d174ad7adf00",
      "name": "Summarize",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1472,
        0
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.callbackUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-Video-Ops-Callback-Timestamp",
              "value": "={{ $json.callbackTimestamp }}"
            },
            {
              "name": "X-Video-Ops-Callback-Signature",
              "value": "={{ $json.callbackSignature }}"
            }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={{ $json.callbackBody }}",
        "options": {}
      },
      "id": "37b223ad-5574-46f0-8d5a-87091a12b448",
      "name": "Callback Success",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        1920,
        0
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, workflowRunId: $json.workflowRunId, createdCount: $json.createdCount, status: 'idea_created' } }}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "dd792f6b-191d-46be-8e94-21b1743d3669",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        2160,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\n\nconst backendBaseUrl = 'https://endurable-defiling-bleak.ngrok-free.dev'.replace(/\\/+$/, '');\nconst hmacSecret = 'video-ops-hmac-2026-super-secret-8f4k29x7p1m';\nconst workflowRunId = Number($('Validate Input').first().json.workflowRunId || 0);\n\nif (!workflowRunId) {\n  throw new Error('workflowRunId manquant');\n}\n\nconst requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;\nconst callbackUrl = `${backendBaseUrl}${requestPath}`;\nconst callbackTimestamp = new Date().toISOString();\n\nconst callbackBodyObject = {\n  status: 'SUCCEEDED',\n  message: 'Creation ideas terminee.'\n};\n\nconst callbackBody = JSON.stringify(callbackBodyObject);\nconst payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');\nconst canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\\n');\nconst callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');\n\nreturn [{\n  json: {\n    callbackUrl,\n    callbackTimestamp,\n    callbackSignature,\n    callbackBody\n  }\n}];\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1680,
        0
      ],
      "id": "5a7bbd2e-fa13-46d0-8366-6ce883eebc0e",
      "name": "Build Callback Auth"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Validate Input",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Validate Input": {
      "main": [
        [
          {
            "node": "Expand Ideas",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Expand Ideas": {
      "main": [
        [
          {
            "node": "HTTP Request Idea",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Idea": {
      "main": [
        [
          {
            "node": "Normalize Topic",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Normalize Topic": {
      "main": [
        [
          {
            "node": "Supabase Create Row",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Create Row": {
      "main": [
        [
          {
            "node": "Summarize",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Summarize": {
      "main": [
        [
          {
            "node": "Build Callback Auth",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Callback Success": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Callback Auth": {
      "main": [
        [
          {
            "node": "Callback Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "03f0bb40bc4d36fe4b86ff52e36f070cd89e1231b2f6d95f96b904abddbfaa85"
  }
}
/// render-template-video
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "render-template-video",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "9fc5681e-a24f-45a9-9d57-10b67fafbd6d",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        0,
        0
      ],
      "webhookId": "2aa2186c-6d97-4cfd-95ec-64068666c1fe"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "name": "contentIdeaId",
              "value": "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
              "type": "number"
            },
            {
              "name": "topic",
              "value": "={{ String($json.body.topic || $json.topic || '').trim() }}",
              "type": "string"
            },
            {
              "name": "script",
              "value": "={{ String($json.body.script || $json.script || '').trim() }}",
              "type": "string"
            },
            {
              "name": "caption",
              "value": "={{ String($json.body.caption || $json.caption || '').trim() }}",
              "type": "string"
            },
            {
              "name": "keyword",
              "value": "={{ String($json.body.keyword || $json.keyword || '').trim() }}",
              "type": "string"
            },
            {
              "name": "workflowRunId",
              "value": "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
              "type": "number"
            }
          ]
        },
        "options": {}
      },
      "id": "bae4c046-2b13-4969-b4d1-9549a48d3a2a",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        240,
        0
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Authorization",
              "value": "=Bearer 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"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [ { role: 'user', content: 'Create one realistic visual prompt for a vertical TikTok business video about this topic: ' + $json.topic + '. Script: ' + $json.script + '. Keyword: ' + ($json.keyword || $json.topic) + '. One sentence only.' } ] }) }}",
        "options": {}
      },
      "id": "5e50e385-e94e-4ea3-81f6-4bad15ff18ee",
      "name": "HTTP Request Image Prompt",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        480,
        0
      ]
    },
    {
      "parameters": {
        "url": "={{ 'https://api.pexels.com/videos/search?query=' + encodeURIComponent($('Set Input').item.json.keyword || $('Set Input').item.json.topic) + '&per_page=5&orientation=portrait' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=4Y1jQOm9eVdMewM4t02e1OSQDkh3G43y9UBMkjQOuLbgiH02BZ8dVEhu"
            }
          ]
        },
        "options": {}
      },
      "id": "5152bb89-3f53-4317-9b35-65f5b313e32d",
      "name": "HTTP Request Pexels",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        720,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const videos = $json.videos || [];\nif (!videos.length) {\n  throw new Error('Aucune video Pexels retournee');\n}\nconst portrait = videos\n  .map(video => ({\n    link: (video.video_files || []).sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]?.link || '',\n    width: video.width || 0,\n    height: video.height || 0\n  }))\n  .find(video => video.height >= video.width && video.link);\nif (!portrait) {\n  throw new Error('Aucune video portrait exploitable retournee par Pexels');\n}\nreturn [{ json: {\n  id: $('Set Input').item.json.contentIdeaId,\n  workflowRunId: $('Set Input').item.json.workflowRunId,\n  topic: $('Set Input').item.json.topic,\n  scripts: $('Set Input').item.json.script,\n  caption: $('Set Input').item.json.caption,\n  image_prompt: String($('HTTP Request Image Prompt').item.json.choices?.[0]?.message?.content || '').trim(),\n  background_video_url: portrait.link\n}}];"
      },
      "id": "a64feb3c-6bc2-4fcd-85b3-4613ccc426e2",
      "name": "Select Portrait Media",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        960,
        0
      ]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "content_ideas",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "id",
              "condition": "eq",
              "keyValue": "={{ $json.id }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "shotstack_status",
              "fieldValue": "preparing"
            },
            {
              "fieldId": "final_video_status",
              "fieldValue": "processing"
            },
            {
              "fieldId": "render_payload",
              "fieldValue": "={{ JSON.stringify($json) }}"
            },
            {
              "fieldId": "render_status",
              "fieldValue": "prepared"
            },
            {
              "fieldId": "pipeline_status",
              "fieldValue": "rendering_requested"
            }
          ]
        }
      },
      "id": "b63ac5e0-1804-4004-ba58-e4fb9554e9ea",
      "name": "Supabase Update Preparing",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1200,
        0
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.shotstack.io/edit/v1/render",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-api-key",
              "value": "hIUXf7D9Pc5G3zjpT6wt3JeLmljX7DfJn6n13QS1"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({\n  timeline: {\n    background: '#0f0f0f',\n    tracks: [\n      {\n        clips: [\n          {\n            asset: {\n              type: 'video',\n              src: $('Select Portrait Media').item.json.background_video_url\n            },\n            start: 0,\n            length: 15,\n            fit: 'cover'\n          }\n        ]\n      },\n      {\n        clips: [\n          {\n            asset: {\n              type: 'title',\n              text: String($('Select Portrait Media').item.json.scripts || '').split('\\n').filter(line => line.trim())[0] || ''\n            },\n            start: 0,\n            length: 3,\n            position: 'center'\n          },\n          {\n            asset: {\n              type: 'title',\n              text: String($('Select Portrait Media').item.json.scripts || '').split('\\n').filter(line => line.trim())[1] || ''\n            },\n            start: 3,\n            length: 3,\n            position: 'center'\n          },\n          {\n            asset: {\n              type: 'title',\n              text: String($('Select Portrait Media').item.json.scripts || '').split('\\n').filter(line => line.trim())[2] || ''\n            },\n            start: 6,\n            length: 3,\n            position: 'center'\n          }\n        ]\n      }\n    ]\n  },\n  output: {\n    format: 'mp4',\n    aspectRatio: '9:16',\n    resolution: 'hd'\n  }\n}) }}\n",
        "options": {}
      },
      "id": "6be3b6fd-d643-4a69-992f-293eafc341aa",
      "name": "HTTP Request Shotstack Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        1440,
        0
      ]
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "content_ideas",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "id",
              "condition": "eq",
              "keyValue": "={{ $('Select Portrait Media').item.json.id }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "shotstack_render_id",
              "fieldValue": "={{ $json.response?.id || $json.id }}"
            },
            {
              "fieldId": "shotstack_status",
              "fieldValue": "queued"
            },
            {
              "fieldId": "final_video_status",
              "fieldValue": "processing"
            },
            {
              "fieldId": "pipeline_status",
              "fieldValue": "rendering_requested"
            }
          ]
        }
      },
      "id": "5f74c39b-8d79-47ad-b1a7-842e4c0dc119",
      "name": "Supabase Update Render Id",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1680,
        0
      ],
      "credentials": {
        "supabaseApi": {
          "id": "olyjINILsTPE6nsD",
          "name": "Supabase account"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $json.callbackUrl }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-Video-Ops-Callback-Timestamp",
              "value": "={{ $json.callbackTimestamp }}"
            },
            {
              "name": "X-Video-Ops-Callback-Signature",
              "value": "={{ $json.callbackSignature }}"
            }
          ]
        },
        "sendBody": true,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": "={{ $json.callbackBody }}",
        "options": {}
      },
      "id": "812a8015-4d0a-481a-8f09-6236a3752467",
      "name": "Callback Success",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [
        2128,
        0
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackRenderId: $('HTTP Request Shotstack Render').item.json.response?.id || $('HTTP Request Shotstack Render').item.json.id, status: 'render_requested' } }}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "aaff1f4a-a55e-4642-bda0-5de9da6a17c9",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [
        2368,
        0
      ]
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\n\nconst backendBaseUrl = 'https://endurable-defiling-bleak.ngrok-free.dev'.replace(/\\/+$/, '');\nconst hmacSecret = 'video-ops-hmac-2026-super-secret-8f4k29x7p1m';\nconst workflowRunId = Number($('Set Input').item.json.workflowRunId || 0);\n\nif (!workflowRunId) {\n  throw new Error('workflowRunId manquant');\n}\n\nconst requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;\nconst callbackUrl = `${backendBaseUrl}${requestPath}`;\nconst callbackTimestamp = new Date().toISOString();\n\nconst callbackBodyObject = {\n  status: 'SUCCEEDED',\n  message: 'Render workflow termine.'\n};\n\nconst callbackBody = JSON.stringify(callbackBodyObject);\nconst payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');\nconst canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\\n');\nconst callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');\n\nreturn [{\n  json: {\n    ...$json,\n    callbackUrl,\n    callbackTimestamp,\n    callbackSignature,\n    callbackBody\n  }\n}];\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1888,
        0
      ],
      "id": "721c2e1d-9df8-44d4-a619-b97ac65a7872",
      "name": "Build Callback Auth"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Set Input",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Input": {
      "main": [
        [
          {
            "node": "HTTP Request Image Prompt",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Image Prompt": {
      "main": [
        [
          {
            "node": "HTTP Request Pexels",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Pexels": {
      "main": [
        [
          {
            "node": "Select Portrait Media",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Select Portrait Media": {
      "main": [
        [
          {
            "node": "Supabase Update Preparing",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Update Preparing": {
      "main": [
        [
          {
            "node": "HTTP Request Shotstack Render",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Shotstack Render": {
      "main": [
        [
          {
            "node": "Supabase Update Render Id",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Update Render Id": {
      "main": [
        [
          {
            "node": "Build Callback Auth",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Callback Success": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Callback Auth": {
      "main": [
        [
          {
            "node": "Callback Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "03f0bb40bc4d36fe4b86ff52e36f070cd89e1231b2f6d95f96b904abddbfaa85"
  }
}

```

### docs\n8n-workflows\templaten8n-audit.md

```md
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

```

### docs\n8n-workflows\templaten8n-diff.md

```md
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

```

### docs\n8n-workflows\tiktok-account-context-example.json

```json
{
  "name": "tiktok-account-context-example",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "tiktok-account-context-example",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-account-context",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-760, 120]
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "name": "tiktokAccountOpenId",
              "value": "={{ String($json.body.tiktokAccountOpenId || $json.tiktokAccountOpenId || '').trim() }}",
              "type": "string"
            },
            {
              "name": "includeCreatorInfo",
              "value": "={{ Boolean($json.body.includeCreatorInfo ?? $json.includeCreatorInfo ?? true) }}",
              "type": "boolean"
            }
          ]
        },
        "options": {}
      },
      "id": "set-input",
      "name": "Set Input",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [-500, 120]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/tiktok/account-context' }}",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "X-Video-Ops-Internal-Secret",
              "value": "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { tiktokAccountOpenId: $json.tiktokAccountOpenId, includeCreatorInfo: $json.includeCreatorInfo } }}",
        "options": {}
      },
      "id": "http-account-context",
      "name": "HTTP Request Account Context",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.4,
      "position": [-200, 120]
    },
    {
      "parameters": {
        "jsCode": "return [{ json: {\n  tiktokAccountOpenId: String($json.tiktokAccountOpenId || '').trim(),\n  tiktokAccessToken: String($json.accessToken || '').trim(),\n  tiktokAuthorizationHeader: [String($json.tokenType || 'Bearer').trim(), String($json.accessToken || '').trim()].filter(Boolean).join(' '),\n  tiktokScope: String($json.scope || '').trim(),\n  privacyLevelOptions: Array.isArray($json.privacyLevelOptions) ? $json.privacyLevelOptions : [],\n  selectedPrivacyLevel: String($json.selectedPrivacyLevel || '').trim()\n}}];"
      },
      "id": "map-output",
      "name": "Map Output",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [80, 120]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, accountContext: $json } }}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.5,
      "position": [340, 120]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Set Input",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Set Input": {
      "main": [
        [
          {
            "node": "HTTP Request Account Context",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request Account Context": {
      "main": [
        [
          {
            "node": "Map Output",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Map Output": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true
  }
}

```

### docs\video-ops-state-machine.md

```md
# Video Ops State Machine

## Canonical stages

The backend now treats these stages as the single product-level source of truth:

1. `CREATION_REQUESTED`
2. `IDEA_CREATED`
3. `SCRIPT_REQUESTED`
4. `SCRIPT_READY`
5. `RENDERING_REQUESTED`
6. `RENDER_READY`
7. `UPLOAD_PREPARING`
8. `PUBLISH_INITIALIZED`
9. `UPLOAD_COMPLETED`
10. `PUBLISHED`
11. `FAILED`

## Workflow mapping

- `MAIN_PIPELINE`:
  - requested -> `CREATION_REQUESTED`
  - success -> `IDEA_CREATED`
- `CHECK_SHOTSTACK`:
  - requested -> `SCRIPT_REQUESTED`
  - success -> `SCRIPT_READY`
- `RENDER_TEMPLATE_VIDEO`:
  - requested -> `RENDERING_REQUESTED`
  - success -> `RENDER_READY`
- `INIT_PUBLISH_TIKTOK`:
  - requested -> `UPLOAD_PREPARING`
  - success -> `PUBLISH_INITIALIZED`
- `TIKTOK_UPLOAD`:
  - requested -> `PUBLISH_INITIALIZED`
  - success -> `UPLOAD_COMPLETED`
- `FINALIZE_PUBLISH`:
  - requested/success -> `PUBLISHED`

## External signal resolution

The backend also derives a stage from vendor signals when it reloads a `content_idea`:

- TikTok `publish_status=published` -> `PUBLISHED`
- TikTok `publish_status in (uploaded, uploading)` -> `UPLOAD_COMPLETED`
- presence of `tiktok_upload_url` -> `PUBLISH_INITIALIZED`
- Shotstack `status=done` or final video ready -> `RENDER_READY`
- Shotstack `status in (queued, rendering, preprocessing, preparing)` -> `RENDERING_REQUESTED`

## Callback contract

Preferred callback auth is now HMAC:

- `X-Video-Ops-Callback-Timestamp`
- `X-Video-Ops-Callback-Signature`

Canonical string:

```text
<HTTP_METHOD>
<REQUEST_PATH>
<ISO_TIMESTAMP>
<BASE64_SHA256_OF_BODY>
```

Legacy `X-Video-Ops-Callback-Secret` is still accepted while `APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true`.

```

### n8n-local\check-live.json

```json
{
    "updatedAt":  "2026-05-02T13:48:24.882Z",
    "createdAt":  "2026-05-02T00:00:00.000Z",
    "id":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name":  "check-shotstack-fixed",
    "description":  null,
    "active":  true,
    "isArchived":  false,
    "nodes":  [
                  {
                      "parameters":  {
                                         "httpMethod":  "POST",
                                         "path":  "check-shotstack",
                                         "responseMode":  "responseNode",
                                         "options":  {

                                                     }
                                     },
                      "id":  "webhook",
                      "name":  "Webhook",
                      "type":  "n8n-nodes-base.webhook",
                      "typeVersion":  2.1,
                      "position":  [
                                       -840,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "assignments":  {
                                                             "assignments":  [
                                                                                 {
                                                                                     "name":  "contentIdeaId",
                                                                                     "value":  "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
                                                                                     "type":  "number"
                                                                                 },
                                                                                 {
                                                                                     "name":  "workflowRunId",
                                                                                     "value":  "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
                                                                                     "type":  "number"
                                                                                 }
                                                                             ]
                                                         },
                                         "options":  {

                                                     }
                                     },
                      "id":  "set-input",
                      "name":  "Set Input",
                      "type":  "n8n-nodes-base.set",
                      "typeVersion":  3.4,
                      "position":  [
                                       -600,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "GET",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $json.contentIdeaId }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "options":  {

                                                     }
                                     },
                      "id":  "get-idea",
                      "name":  "Backend Get Content Idea",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -360,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const idea = $json;\nif (!idea || !idea.id) throw new Error(\u0027contentIdea introuvable.\u0027);\nif (!idea.shotstack_render_id) throw new Error(\u0027Aucun shotstack_render_id pour cette contentIdea.\u0027);\nconst status = String(idea.shotstack_status || \u0027\u0027).toLowerCase();\nif (![\u0027queued\u0027, \u0027rendering\u0027, \u0027preparing\u0027].includes(status)) {\n  return [{ json: { skip: true, reason: \u0027shotstack_status=\u0027 + status + \u0027 â€” rien a faire.\u0027, idea } }];\n}\nreturn [{ json: { skip: false, renderId: idea.shotstack_render_id, ideaId: idea.id, idea } }];"
                                     },
                      "id":  "validate-render",
                      "name":  "Validate Render State",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -120,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "conditions":  {
                                                            "options":  {
                                                                            "caseSensitive":  true,
                                                                            "leftValue":  "",
                                                                            "typeValidation":  "strict"
                                                                        },
                                                            "conditions":  [
                                                                               {
                                                                                   "id":  "skip-check",
                                                                                   "leftValue":  "={{ $json.skip }}",
                                                                                   "rightValue":  true,
                                                                                   "operator":  {
                                                                                                    "type":  "boolean",
                                                                                                    "operation":  "equals"
                                                                                                }
                                                                               }
                                                                           ],
                                                            "combinator":  "and"
                                                        },
                                         "options":  {

                                                     }
                                     },
                      "id":  "if-skip",
                      "name":  "Skip if not pending",
                      "type":  "n8n-nodes-base.if",
                      "typeVersion":  2.2,
                      "position":  [
                                       120,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "GET",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/shotstack/render/\u0027 + $json.renderId }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "options":  {

                                                     }
                                     },
                      "id":  "shotstack-status",
                      "name":  "Backend Get Shotstack Status",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       360,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const status = String($json.response?.status || \u0027\u0027).toLowerCase();\nconst ideaId = $(\u0027Validate Render State\u0027).item.json.ideaId;\nif (status === \u0027done\u0027) {\n  return [{ json: { ideaId, patch: { shotstack_status: \u0027done\u0027, shotstack_url: $json.response?.url || \u0027\u0027, final_video_status: \u0027ready\u0027, pipeline_status: \u0027render_ready\u0027 }, callbackStatus: \u0027SUCCEEDED\u0027, callbackMessage: \u0027Render Shotstack termine.\u0027 } }];\n}\nif (status === \u0027failed\u0027) {\n  return [{ json: { ideaId, patch: { shotstack_status: \u0027failed\u0027, final_video_status: \u0027failed\u0027, pipeline_status: \u0027failed\u0027 }, callbackStatus: \u0027FAILED\u0027, callbackMessage: \u0027Render Shotstack en echec.\u0027 } }];\n}\nreturn [];"
                                     },
                      "id":  "map-update",
                      "name":  "Build Update Payload",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       600,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "PATCH",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $json.ideaId }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify($json.patch) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "update-row",
                      "name":  "Backend Update Content Idea",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       840,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "respondWith":  "json",
                                         "responseBody":  "={{ { ok: true, contentIdeaId: $(\u0027Set Input\u0027).item.json.contentIdeaId, shotstackStatus: $(\u0027Build Update Payload\u0027).item.json.patch.shotstack_status } }}",
                                         "options":  {
                                                         "responseCode":  200
                                                     }
                                     },
                      "id":  "respond",
                      "name":  "Respond to Webhook",
                      "type":  "n8n-nodes-base.respondToWebhook",
                      "typeVersion":  1.5,
                      "position":  [
                                       1080,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/workflow-runs/\u0027 + $(\u0027Set Input\u0027).item.json.workflowRunId + \u0027/complete\u0027 }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Callback-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ status: $(\u0027Build Update Payload\u0027).item.json.callbackStatus, message: $(\u0027Build Update Payload\u0027).item.json.callbackMessage, responsePayload: JSON.stringify({ contentIdeaId: $(\u0027Set Input\u0027).item.json.contentIdeaId, shotstackStatus: $(\u0027Build Update Payload\u0027).item.json.patch.shotstack_status }) }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "callback",
                      "name":  "Callback Backend",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       1320,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "respondWith":  "json",
                                         "responseBody":  "={{ { ok: true, contentIdeaId: $(\u0027Set Input\u0027).item.json.contentIdeaId, skipped: true, reason: $(\u0027Validate Render State\u0027).item.json.reason } }}",
                                         "options":  {
                                                         "responseCode":  200
                                                     }
                                     },
                      "id":  "respond-skip",
                      "name":  "Respond Skipped",
                      "type":  "n8n-nodes-base.respondToWebhook",
                      "typeVersion":  1.5,
                      "position":  [
                                       360,
                                       300
                                   ]
                  }
              ],
    "connections":  {
                        "Webhook":  {
                                        "main":  [
                                                     [
                                                         {
                                                             "node":  "Set Input",
                                                             "type":  "main",
                                                             "index":  0
                                                         }
                                                     ]
                                                 ]
                                    },
                        "Set Input":  {
                                          "main":  [
                                                       [
                                                           {
                                                               "node":  "Backend Get Content Idea",
                                                               "type":  "main",
                                                               "index":  0
                                                           }
                                                       ]
                                                   ]
                                      },
                        "Backend Get Content Idea":  {
                                                         "main":  [
                                                                      [
                                                                          {
                                                                              "node":  "Validate Render State",
                                                                              "type":  "main",
                                                                              "index":  0
                                                                          }
                                                                      ]
                                                                  ]
                                                     },
                        "Validate Render State":  {
                                                      "main":  [
                                                                   [
                                                                       {
                                                                           "node":  "Skip if not pending",
                                                                           "type":  "main",
                                                                           "index":  0
                                                                       }
                                                                   ]
                                                               ]
                                                  },
                        "Skip if not pending":  {
                                                    "main":  [
                                                                 [
                                                                     {
                                                                         "node":  "Respond Skipped",
                                                                         "type":  "main",
                                                                         "index":  0
                                                                     }
                                                                 ],
                                                                 [
                                                                     {
                                                                         "node":  "Backend Get Shotstack Status",
                                                                         "type":  "main",
                                                                         "index":  0
                                                                     }
                                                                 ]
                                                             ]
                                                },
                        "Backend Get Shotstack Status":  {
                                                             "main":  [
                                                                          [
                                                                              {
                                                                                  "node":  "Build Update Payload",
                                                                                  "type":  "main",
                                                                                  "index":  0
                                                                              }
                                                                          ]
                                                                      ]
                                                         },
                        "Build Update Payload":  {
                                                     "main":  [
                                                                  [
                                                                      {
                                                                          "node":  "Backend Update Content Idea",
                                                                          "type":  "main",
                                                                          "index":  0
                                                                      }
                                                                  ]
                                                              ]
                                                 },
                        "Backend Update Content Idea":  {
                                                            "main":  [
                                                                         [
                                                                             {
                                                                                 "node":  "Respond to Webhook",
                                                                                 "type":  "main",
                                                                                 "index":  0
                                                                             }
                                                                         ]
                                                                     ]
                                                        },
                        "Respond to Webhook":  {
                                                   "main":  [
                                                                [
                                                                    {
                                                                        "node":  "Callback Backend",
                                                                        "type":  "main",
                                                                        "index":  0
                                                                    }
                                                                ]
                                                            ]
                                               },
                        "Callback Backend":  {
                                                 "main":  [

                                                          ]
                                             }
                    },
    "pinData":  {

                },
    "meta":  {
                 "templateCredsSetupCompleted":  true
             }
}

```

### n8n-local\creation-live.json

```json
{
    "updatedAt":  "2026-05-02T13:48:24.882Z",
    "createdAt":  "2026-04-30T01:59:00.930Z",
    "id":  "7d540770-0aa9-419f-a5ed-618d6bccb605",
    "name":  "creation-ideas",
    "description":  null,
    "active":  true,
    "isArchived":  false,
    "nodes":  [
                  {
                      "parameters":  {
                                         "httpMethod":  "POST",
                                         "path":  "creation-ideas",
                                         "responseMode":  "responseNode",
                                         "options":  {

                                                     }
                                     },
                      "id":  "webhook",
                      "name":  "Webhook",
                      "type":  "n8n-nodes-base.webhook",
                      "typeVersion":  2.1,
                      "position":  [
                                       -1080,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const body = $input.first().json.body || {};\nconst category = String(body.category || \u0027\u0027).trim();\nconst ideaCount = Number(body.ideaCount || 1);\nif (!category) throw new Error(\u0027category est obligatoire\u0027);\nif (!Number.isInteger(ideaCount) || ideaCount \u003c 1 || ideaCount \u003e 5) throw new Error(\u0027ideaCount doit etre entre 1 et 5\u0027);\nreturn [{ json: { category, ideaCount, workflowRunId: Number(body.workflowRunId || 0), templateId: body.templateId || null, tiktokAccountOpenId: body.tiktokAccountOpenId || null } }];"
                                     },
                      "id":  "validate-input",
                      "name":  "Validate Input",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -820,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const input = $input.first().json;\nreturn Array.from({ length: input.ideaCount }).map((_, index) =\u003e ({ json: { ...input, iteration: index + 1 } }));"
                                     },
                      "id":  "expand",
                      "name":  "Expand Ideas",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -580,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "https://api.groq.com/openai/v1/chat/completions",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "Authorization",
                                                                                         "value":  "={{ \u0027Bearer \u0027 + $env.GROQ_API_KEY }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ { model: \u0027llama-3.1-8b-instant\u0027, messages: [ { role: \u0027user\u0027, content: \u0027Generate exactly one TikTok content idea for category \u0027 + $json.category + \u0027. Return only the idea text, no numbering, no explanation.\u0027 } ] } }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "groq",
                      "name":  "HTTP Request Idea",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -340,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "return [{ json: { topic: String($json.choices?.[0]?.message?.content || \u0027\u0027).trim(), category: $(\u0027Expand Ideas\u0027).item.json.category, workflowRunId: $(\u0027Expand Ideas\u0027).item.json.workflowRunId, templateId: $(\u0027Expand Ideas\u0027).item.json.templateId, tiktokAccountOpenId: $(\u0027Expand Ideas\u0027).item.json.tiktokAccountOpenId } }];"
                                     },
                      "id":  "normalize",
                      "name":  "Normalize Topic",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -100,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas\u0027 }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ category: $json.category, topic: $json.topic, status: \u0027new\u0027, pipelineStatus: \u0027idea_created\u0027, publishStatus: \u0027draft\u0027, platform: \u0027tiktok\u0027, templateId: $json.templateId || null, tiktokAccountOpenId: $json.tiktokAccountOpenId || null }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "create-row",
                      "name":  "Backend Create Content Idea",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       140,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const items = $input.all();\nconst workflowRunId = Number($(\u0027Validate Input\u0027).first().json.workflowRunId || 0);\nreturn [{ json: { workflowRunId, createdCount: items.length } }];"
                                     },
                      "id":  "summarize",
                      "name":  "Summarize",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       380,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "respondWith":  "json",
                                         "responseBody":  "={{ { ok: true, workflowRunId: $(\u0027Summarize\u0027).item.json.workflowRunId, createdCount: $(\u0027Summarize\u0027).item.json.createdCount, status: \u0027idea_created\u0027 } }}",
                                         "options":  {
                                                         "responseCode":  200
                                                     }
                                     },
                      "id":  "respond",
                      "name":  "Respond to Webhook",
                      "type":  "n8n-nodes-base.respondToWebhook",
                      "typeVersion":  1.5,
                      "position":  [
                                       620,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const http = require(\u0027http\u0027);\nconst https = require(\u0027https\u0027);\nconst { URL } = require(\u0027url\u0027);\nconst baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027);\nconst callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || \u0027\u0027);\nconst workflowRunId = Number($(\u0027Summarize\u0027).item.json.workflowRunId || 0);\nif (!baseUrl) throw new Error(\u0027APP_VIDEO_OPS_BACKEND_BASE_URL manquante\u0027);\nif (!callbackSecret) throw new Error(\u0027APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante\u0027);\nif (!workflowRunId) throw new Error(\u0027workflowRunId manquant\u0027);\nconst body = JSON.stringify({ status: \u0027SUCCEEDED\u0027, message: \u0027Creation ideas terminee.\u0027, responsePayload: JSON.stringify({ createdCount: Number($json.createdCount || 0) }) });\nconst url = new URL(baseUrl + \u0027/api/video-ops/workflow-runs/\u0027 + workflowRunId + \u0027/complete\u0027);\nconst client = url.protocol === \u0027https:\u0027 ? https : http;\nconst sleep = (ms) =\u003e new Promise((resolve) =\u003e setTimeout(resolve, ms));\nlet response = null;\nlet lastError = null;\nfor (let attempt = 1; attempt \u003c= 6; attempt += 1) {\n  try {\n    response = await new Promise((resolve, reject) =\u003e {\n      const req = client.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === \u0027https:\u0027 ? 443 : 80), path: url.pathname + url.search, method: \u0027POST\u0027, headers: { \u0027Content-Type\u0027: \u0027application/json\u0027, \u0027Content-Length\u0027: Buffer.byteLength(body), \u0027X-Video-Ops-Callback-Secret\u0027: callbackSecret } }, (res) =\u003e { let data = \u0027\u0027; res.on(\u0027data\u0027, (chunk) =\u003e { data += chunk; }); res.on(\u0027end\u0027, () =\u003e resolve({ statusCode: res.statusCode || 0, body: data })); });\n      req.on(\u0027error\u0027, reject);\n      req.write(body);\n      req.end();\n    });\n    if (response.statusCode \u003e= 200 \u0026\u0026 response.statusCode \u003c 300) break;\n    lastError = \u0027Callback backend refuse: \u0027 + response.statusCode;\n    if (response.statusCode !== 404 || attempt === 6) throw new Error(lastError);\n  } catch (error) {\n    lastError = error.message || String(error);\n    if (attempt === 6) throw error;\n  }\n  await sleep(500 * attempt);\n}\nif (!response || response.statusCode \u003c 200 || response.statusCode \u003e= 300) throw new Error(lastError || \u0027Callback backend refuse.\u0027);\nreturn [{ json: { ...$json, callbackStatusCode: response.statusCode } }];"
                                     },
                      "id":  "callback",
                      "name":  "Callback Success",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       860,
                                       120
                                   ]
                  }
              ],
    "connections":  {
                        "Webhook":  {
                                        "main":  [
                                                     [
                                                         {
                                                             "node":  "Validate Input",
                                                             "type":  "main",
                                                             "index":  0
                                                         }
                                                     ]
                                                 ]
                                    },
                        "Validate Input":  {
                                               "main":  [
                                                            [
                                                                {
                                                                    "node":  "Expand Ideas",
                                                                    "type":  "main",
                                                                    "index":  0
                                                                }
                                                            ]
                                                        ]
                                           },
                        "Expand Ideas":  {
                                             "main":  [
                                                          [
                                                              {
                                                                  "node":  "HTTP Request Idea",
                                                                  "type":  "main",
                                                                  "index":  0
                                                              }
                                                          ]
                                                      ]
                                         },
                        "HTTP Request Idea":  {
                                                  "main":  [
                                                               [
                                                                   {
                                                                       "node":  "Normalize Topic",
                                                                       "type":  "main",
                                                                       "index":  0
                                                                   }
                                                               ]
                                                           ]
                                              },
                        "Normalize Topic":  {
                                                "main":  [
                                                             [
                                                                 {
                                                                     "node":  "Backend Create Content Idea",
                                                                     "type":  "main",
                                                                     "index":  0
                                                                 }
                                                             ]
                                                         ]
                                            },
                        "Backend Create Content Idea":  {
                                                            "main":  [
                                                                         [
                                                                             {
                                                                                 "node":  "Summarize",
                                                                                 "type":  "main",
                                                                                 "index":  0
                                                                             }
                                                                         ]
                                                                     ]
                                                        },
                        "Summarize":  {
                                          "main":  [
                                                       [
                                                           {
                                                               "node":  "Respond to Webhook",
                                                               "type":  "main",
                                                               "index":  0
                                                           }
                                                       ]
                                                   ]
                                      },
                        "Respond to Webhook":  {
                                                   "main":  [
                                                                [
                                                                    {
                                                                        "node":  "Callback Success",
                                                                        "type":  "main",
                                                                        "index":  0
                                                                    }
                                                                ]
                                                            ]
                                               },
                        "Callback Success":  {
                                                 "main":  [

                                                          ]
                                             }
                    },
    "pinData":  {

                },
    "meta":  {
                 "templateCredsSetupCompleted":  true
             }
}

```

### n8n-local\init-live.json

```json
{
    "updatedAt":  "2026-05-02T13:48:24.882Z",
    "createdAt":  "2026-04-30T02:15:00.000Z",
    "id":  "e42c717c-5ced-4501-a1b9-4fdc43b3f54d",
    "name":  "init-publish-tiktok-fixed",
    "description":  null,
    "active":  true,
    "isArchived":  false,
    "nodes":  [
                  {
                      "parameters":  {
                                         "httpMethod":  "POST",
                                         "path":  "init-publish-tiktok",
                                         "responseMode":  "responseNode",
                                         "options":  {

                                                     }
                                     },
                      "id":  "webhook",
                      "name":  "Webhook",
                      "type":  "n8n-nodes-base.webhook",
                      "typeVersion":  2.1,
                      "position":  [
                                       -1180,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "assignments":  {
                                                             "assignments":  [
                                                                                 {
                                                                                     "name":  "contentIdeaId",
                                                                                     "value":  "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
                                                                                     "type":  "number"
                                                                                 },
                                                                                 {
                                                                                     "name":  "workflowRunId",
                                                                                     "value":  "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
                                                                                     "type":  "number"
                                                                                 }
                                                                             ]
                                                         },
                                         "options":  {

                                                     }
                                     },
                      "id":  "set-input",
                      "name":  "Set Input",
                      "type":  "n8n-nodes-base.set",
                      "typeVersion":  3.4,
                      "position":  [
                                       -940,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "GET",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $json.contentIdeaId }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "options":  {

                                                     }
                                     },
                      "id":  "get-idea",
                      "name":  "Backend Get Content Idea",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -700,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const idea = $json;\nif (!idea || !idea.id) throw new Error(\u0027contentIdea introuvable.\u0027);\nif (idea.platform \u0026\u0026 idea.platform !== \u0027tiktok\u0027) throw new Error(\u0027Cette contentIdea n\\\u0027est pas prevue pour TikTok.\u0027);\nif (idea.final_video_status \u0026\u0026 idea.final_video_status !== \u0027ready\u0027) throw new Error(\u0027La video finale n\\\u0027est pas encore prete. Status: \u0027 + idea.final_video_status);\nif (!idea.shotstack_url) throw new Error(\u0027La video finale Shotstack est absente.\u0027);\nif (idea.publish_status === \u0027published\u0027) throw new Error(\u0027Cette video est deja marquee comme publiee.\u0027);\nconst openId = idea.tiktok_account_open_id || \u0027\u0027;\nif (!openId) throw new Error(\u0027Aucun tiktokAccountOpenId n\\\u0027est defini pour cette video.\u0027);\nreturn [{ json: { idea, openId } }];"
                                     },
                      "id":  "validate-idea",
                      "name":  "Validate Idea",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -460,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "GET",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/tiktok-accounts?openId=\u0027 + encodeURIComponent($json.openId) }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "options":  {

                                                     }
                                     },
                      "id":  "get-account",
                      "name":  "Backend Get TikTok Account",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -220,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const accounts = Array.isArray($json) ? $json : [$json];\nconst account = accounts[0];\nif (!account || !account.id) throw new Error(\u0027Compte TikTok introuvable pour openId: \u0027 + $(\\\u0027Validate Idea\\\u0027).item.json.openId);\nif (!account.refresh_token) throw new Error(\u0027refresh_token manquant pour ce compte TikTok.\u0027);\nreturn [{ json: { accountId: account.id, openId: account.open_id, refreshToken: account.refresh_token } }];"
                                     },
                      "id":  "extract-account",
                      "name":  "Extract Account",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       20,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "https://open.tiktokapis.com/v2/oauth/token/",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/x-www-form-urlencoded"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "contentType":  "form-urlencoded",
                                         "bodyParameters":  {
                                                                "parameters":  [
                                                                                   {
                                                                                       "name":  "client_key",
                                                                                       "value":  "={{ $env.APP_VIDEO_OPS_TIKTOK_CLIENT_KEY }}"
                                                                                   },
                                                                                   {
                                                                                       "name":  "client_secret",
                                                                                       "value":  "={{ $env.APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET }}"
                                                                                   },
                                                                                   {
                                                                                       "name":  "grant_type",
                                                                                       "value":  "refresh_token"
                                                                                   },
                                                                                   {
                                                                                       "name":  "refresh_token",
                                                                                       "value":  "={{ $json.refreshToken }}"
                                                                                   }
                                                                               ]
                                                            },
                                         "options":  {

                                                     }
                                     },
                      "id":  "refresh-token",
                      "name":  "HTTP Request Refresh Token",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       260,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "PATCH",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/tiktok-accounts/\u0027 + $(\u0027Extract Account\u0027).item.json.accountId }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ access_token: $json.access_token, refresh_token: $json.refresh_token, open_id: $json.open_id || $(\u0027Extract Account\u0027).item.json.openId, scope: $json.scope, token_type: $json.token_type }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "update-account",
                      "name":  "Backend Update TikTok Account",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       500,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json; charset=UTF-8"
                                                                                     },
                                                                                     {
                                                                                         "name":  "Authorization",
                                                                                         "value":  "={{ \u0027Bearer \u0027 + $(\u0027HTTP Request Refresh Token\u0027).item.json.access_token }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "options":  {

                                                     }
                                     },
                      "id":  "creator-info",
                      "name":  "HTTP Request Creator Info",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       740,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "HEAD",
                                         "url":  "={{ $(\u0027Backend Get Content Idea\u0027).item.json.shotstack_url }}",
                                         "options":  {
                                                         "response":  {
                                                                          "response":  {
                                                                                           "fullResponse":  true
                                                                                       }
                                                                      }
                                                     }
                                     },
                      "id":  "video-head",
                      "name":  "HTTP Request Video Head",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       980,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "https://open.tiktokapis.com/v2/post/publish/video/init/",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json; charset=UTF-8"
                                                                                     },
                                                                                     {
                                                                                         "name":  "Authorization",
                                                                                         "value":  "={{ \u0027Bearer \u0027 + $(\u0027HTTP Request Refresh Token\u0027).item.json.access_token }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "contentType":  "raw",
                                         "rawContentType":  "application/json; charset=UTF-8",
                                         "body":  "={{ JSON.stringify({ post_info: { title: String($(\u0027Backend Get Content Idea\u0027).item.json.caption || \u0027\u0027).trim().slice(0, 150), privacy_level: ($(\u0027HTTP Request Creator Info\u0027).item.json.data?.privacy_level_options || [\u0027SELF_ONLY\u0027]).includes(\u0027SELF_ONLY\u0027) ? \u0027SELF_ONLY\u0027 : ($(\u0027HTTP Request Creator Info\u0027).item.json.data?.privacy_level_options || [\u0027SELF_ONLY\u0027])[0], disable_duet: true, disable_comment: false, disable_stitch: true, video_cover_timestamp_ms: 1000 }, source_info: { source: \u0027FILE_UPLOAD\u0027, video_size: Number($(\u0027HTTP Request Video Head\u0027).item.json.headers[\u0027content-length\u0027] || 0), chunk_size: Number($(\u0027HTTP Request Video Head\u0027).item.json.headers[\u0027content-length\u0027] || 0), total_chunk_count: 1 } }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "init-publish",
                      "name":  "HTTP Request Init Publish",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       1220,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "PATCH",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $(\u0027Backend Get Content Idea\u0027).item.json.id }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ tiktok_publish_id: $json.data?.publish_id, tiktok_upload_url: $json.data?.upload_url, tiktok_upload_status: \u0027init_done\u0027, publish_status: \u0027draft\u0027 }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "update-idea",
                      "name":  "Backend Update Content Idea",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       1460,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/workflow-runs/\u0027 + $(\u0027Set Input\u0027).item.json.workflowRunId + \u0027/complete\u0027 }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Callback-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ { status: \u0027SUCCEEDED\u0027, message: \u0027Init publish TikTok termine.\u0027, responsePayload: JSON.stringify({ contentIdeaId: $(\u0027Backend Get Content Idea\u0027).item.json.id, uploadUrl: $(\u0027HTTP Request Init Publish\u0027).item.json.data?.upload_url }) } }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "callback",
                      "name":  "Callback Success",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       1700,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "respondWith":  "json",
                                         "responseBody":  "={{ { ok: true, contentIdeaId: $(\u0027Backend Get Content Idea\u0027).item.json.id, publishId: $(\u0027HTTP Request Init Publish\u0027).item.json.data?.publish_id, uploadUrl: $(\u0027HTTP Request Init Publish\u0027).item.json.data?.upload_url, status: \u0027init_done\u0027 } }}",
                                         "options":  {
                                                         "responseCode":  200
                                                     }
                                     },
                      "id":  "respond",
                      "name":  "Respond to Webhook",
                      "type":  "n8n-nodes-base.respondToWebhook",
                      "typeVersion":  1.5,
                      "position":  [
                                       1940,
                                       120
                                   ]
                  }
              ],
    "connections":  {
                        "Webhook":  {
                                        "main":  [
                                                     [
                                                         {
                                                             "node":  "Set Input",
                                                             "type":  "main",
                                                             "index":  0
                                                         }
                                                     ]
                                                 ]
                                    },
                        "Set Input":  {
                                          "main":  [
                                                       [
                                                           {
                                                               "node":  "Backend Get Content Idea",
                                                               "type":  "main",
                                                               "index":  0
                                                           }
                                                       ]
                                                   ]
                                      },
                        "Backend Get Content Idea":  {
                                                         "main":  [
                                                                      [
                                                                          {
                                                                              "node":  "Validate Idea",
                                                                              "type":  "main",
                                                                              "index":  0
                                                                          }
                                                                      ]
                                                                  ]
                                                     },
                        "Validate Idea":  {
                                              "main":  [
                                                           [
                                                               {
                                                                   "node":  "Backend Get TikTok Account",
                                                                   "type":  "main",
                                                                   "index":  0
                                                               }
                                                           ]
                                                       ]
                                          },
                        "Backend Get TikTok Account":  {
                                                           "main":  [
                                                                        [
                                                                            {
                                                                                "node":  "Extract Account",
                                                                                "type":  "main",
                                                                                "index":  0
                                                                            }
                                                                        ]
                                                                    ]
                                                       },
                        "Extract Account":  {
                                                "main":  [
                                                             [
                                                                 {
                                                                     "node":  "HTTP Request Refresh Token",
                                                                     "type":  "main",
                                                                     "index":  0
                                                                 }
                                                             ]
                                                         ]
                                            },
                        "HTTP Request Refresh Token":  {
                                                           "main":  [
                                                                        [
                                                                            {
                                                                                "node":  "Backend Update TikTok Account",
                                                                                "type":  "main",
                                                                                "index":  0
                                                                            }
                                                                        ]
                                                                    ]
                                                       },
                        "Backend Update TikTok Account":  {
                                                              "main":  [
                                                                           [
                                                                               {
                                                                                   "node":  "HTTP Request Creator Info",
                                                                                   "type":  "main",
                                                                                   "index":  0
                                                                               }
                                                                           ]
                                                                       ]
                                                          },
                        "HTTP Request Creator Info":  {
                                                          "main":  [
                                                                       [
                                                                           {
                                                                               "node":  "HTTP Request Video Head",
                                                                               "type":  "main",
                                                                               "index":  0
                                                                           }
                                                                       ]
                                                                   ]
                                                      },
                        "HTTP Request Video Head":  {
                                                        "main":  [
                                                                     [
                                                                         {
                                                                             "node":  "HTTP Request Init Publish",
                                                                             "type":  "main",
                                                                             "index":  0
                                                                         }
                                                                     ]
                                                                 ]
                                                    },
                        "HTTP Request Init Publish":  {
                                                          "main":  [
                                                                       [
                                                                           {
                                                                               "node":  "Backend Update Content Idea",
                                                                               "type":  "main",
                                                                               "index":  0
                                                                           }
                                                                       ]
                                                                   ]
                                                      },
                        "Backend Update Content Idea":  {
                                                            "main":  [
                                                                         [
                                                                             {
                                                                                 "node":  "Callback Success",
                                                                                 "type":  "main",
                                                                                 "index":  0
                                                                             }
                                                                         ]
                                                                     ]
                                                        },
                        "Callback Success":  {
                                                 "main":  [
                                                              [
                                                                  {
                                                                      "node":  "Respond to Webhook",
                                                                      "type":  "main",
                                                                      "index":  0
                                                                  }
                                                              ]
                                                          ]
                                             }
                    },
    "pinData":  {

                },
    "meta":  {
                 "templateCredsSetupCompleted":  true
             }
}

```

### n8n-local\render-live.json

```json
{
    "updatedAt":  "2026-05-02T13:48:24.882Z",
    "createdAt":  "2026-04-30T02:10:00.000Z",
    "id":  "0d1fe204-62f0-4ba5-9fd1-20a405e8d300",
    "name":  "render-template-video-with-callback",
    "description":  null,
    "active":  true,
    "isArchived":  false,
    "nodes":  [
                  {
                      "parameters":  {
                                         "httpMethod":  "POST",
                                         "path":  "render-template-video",
                                         "responseMode":  "responseNode",
                                         "options":  {

                                                     }
                                     },
                      "id":  "webhook",
                      "name":  "Webhook",
                      "type":  "n8n-nodes-base.webhook",
                      "typeVersion":  2.1,
                      "position":  [
                                       -980,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "assignments":  {
                                                             "assignments":  [
                                                                                 {
                                                                                     "name":  "contentIdeaId",
                                                                                     "value":  "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
                                                                                     "type":  "number"
                                                                                 },
                                                                                 {
                                                                                     "name":  "topic",
                                                                                     "value":  "={{ String($json.body.topic || $json.topic || \u0027\u0027).trim() }}",
                                                                                     "type":  "string"
                                                                                 },
                                                                                 {
                                                                                     "name":  "script",
                                                                                     "value":  "={{ String($json.body.script || $json.script || \u0027\u0027).trim() }}",
                                                                                     "type":  "string"
                                                                                 },
                                                                                 {
                                                                                     "name":  "caption",
                                                                                     "value":  "={{ String($json.body.caption || $json.caption || \u0027\u0027).trim() }}",
                                                                                     "type":  "string"
                                                                                 },
                                                                                 {
                                                                                     "name":  "keyword",
                                                                                     "value":  "={{ String($json.body.keyword || $json.keyword || \u0027\u0027).trim() }}",
                                                                                     "type":  "string"
                                                                                 },
                                                                                 {
                                                                                     "name":  "workflowRunId",
                                                                                     "value":  "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
                                                                                     "type":  "number"
                                                                                 }
                                                                             ]
                                                         },
                                         "options":  {

                                                     }
                                     },
                      "id":  "set-input",
                      "name":  "Set Input",
                      "type":  "n8n-nodes-base.set",
                      "typeVersion":  3.4,
                      "position":  [
                                       -740,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "https://api.groq.com/openai/v1/chat/completions",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "Authorization",
                                                                                         "value":  "={{ \u0027Bearer \u0027 + $env.GROQ_API_KEY }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ model: \u0027llama-3.1-8b-instant\u0027, messages: [ { role: \u0027user\u0027, content: \u0027Create one realistic visual prompt for a vertical TikTok business video about this topic: \u0027 + $json.topic + \u0027. Script: \u0027 + $json.script + \u0027. Keyword: \u0027 + ($json.keyword || $json.topic) + \u0027. One sentence only.\u0027 } ] }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "groq-prompt",
                      "name":  "HTTP Request Image Prompt",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -500,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "url":  "={{ (() =\u003e { const raw = String($(\u0027Set Input\u0027).item.json.keyword || $(\u0027Set Input\u0027).item.json.topic || \u0027business\u0027); const normalized = raw.replace(/[\"\u0027\u0026]/g, \u0027 \u0027).replace(/[^\\w\\s-]/g, \u0027 \u0027).replace(/\\s+/g, \u0027 \u0027).trim(); const query = (normalized || \u0027business\u0027).split(\u0027 \u0027).slice(0, 4).join(\u0027 \u0027) || \u0027business\u0027; return \u0027https://api.pexels.com/videos/search?query=\u0027 + encodeURIComponent(query) + \u0027\u0026per_page=5\u0026orientation=portrait\u0027; })() }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Authorization",
                                                                                         "value":  "={{ $env.PEXELS_API_KEY }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "options":  {

                                                     }
                                     },
                      "id":  "pexels",
                      "name":  "HTTP Request Pexels",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -260,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const videos = $json.videos || [];\nif (!videos.length) throw new Error(\u0027Aucune video Pexels retournee\u0027);\nconst preferred = [];\nconst fallback = [];\nfor (const video of videos) {\n  for (const file of video.video_files || []) {\n    if (!file?.link || file.file_type !== \u0027video/mp4\u0027) continue;\n    const width = Number(file.width || video.width || 0);\n    const height = Number(file.height || video.height || 0);\n    if (!width || !height || height \u003c= width) continue;\n    const item = { link: file.link, width, height };\n    if ((width === 1080 \u0026\u0026 height === 1920) || (width === 720 \u0026\u0026 height === 1280) || (width === 540 \u0026\u0026 height === 960)) { preferred.push(item); } else { fallback.push(item); }\n  }\n}\nconst pick = (preferred[0] || fallback.sort((a, b) =\u003e (b.height * b.width) - (a.height * a.width))[0]);\nif (!pick) throw new Error(\u0027Aucune video portrait exploitable retournee par Pexels\u0027);\nreturn [{ json: { id: $(\u0027Set Input\u0027).item.json.contentIdeaId, workflowRunId: $(\u0027Set Input\u0027).item.json.workflowRunId, topic: $(\u0027Set Input\u0027).item.json.topic, scripts: $(\u0027Set Input\u0027).item.json.script, caption: $(\u0027Set Input\u0027).item.json.caption, image_prompt: String($(\u0027HTTP Request Image Prompt\u0027).item.json.choices?.[0]?.message?.content || \u0027\u0027).trim(), background_video_url: pick.link } }];"
                                     },
                      "id":  "select-media",
                      "name":  "Select Portrait Media",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -20,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "PATCH",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $json.id }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ shotstack_status: \u0027preparing\u0027, final_video_status: \u0027processing\u0027, render_payload: JSON.stringify($json), render_status: \u0027prepared\u0027, pipeline_status: \u0027rendering_requested\u0027 }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "update-preparing",
                      "name":  "Backend Update Preparing",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       220,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/shotstack/render\u0027 }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify((() =\u003e { const cleanText = (value) =\u003e String(value || \u0027\u0027).normalize(\u0027NFKD\u0027).replace(/[^\\x20-\\x7E]/g, \u0027 \u0027).replace(/\\s+/g, \u0027 \u0027).trim().slice(0, 120); const lines = String($json.scripts || \u0027\u0027).split(\u0027\\n\u0027).map((line) =\u003e cleanText(line)).filter(Boolean); const fallbackTopic = cleanText($(\u0027Set Input\u0027).item.json.topic || \u0027Video business\u0027); const textLines = (lines.length ? lines : [fallbackTopic]).slice(0, 3); const titleClips = textLines.filter(Boolean).map((line, index) =\u003e ({ asset: { type: \u0027title\u0027, text: line, style: \u0027minimal\u0027, color: \u0027#ffffff\u0027, background: \u0027rgba(15,15,15,0.55)\u0027 }, start: index * 3, length: 3, position: \u0027center\u0027 })); return { timeline: { background: \u0027#0f0f0f\u0027, tracks: [ { clips: [ { asset: { type: \u0027video\u0027, src: $json.background_video_url }, start: 0, length: 15, fit: \u0027cover\u0027 } ] }, ...(titleClips.length ? [{ clips: titleClips }] : []) ] }, output: { format: \u0027mp4\u0027, aspectRatio: \u00279:16\u0027, resolution: \u0027hd\u0027 } }; })()) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "shotstack-render",
                      "name":  "HTTP Request Shotstack Render",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       460,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "PATCH",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $(\u0027Select Portrait Media\u0027).item.json.id }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ shotstack_render_id: $json.response?.id || $json.id, shotstack_status: \u0027queued\u0027, final_video_status: \u0027processing\u0027, pipeline_status: \u0027rendering_requested\u0027 }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "update-render-id",
                      "name":  "Backend Update Render Id",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       700,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "respondWith":  "json",
                                         "responseBody":  "={{ { ok: true, contentIdeaId: $(\u0027Set Input\u0027).item.json.contentIdeaId, shotstackRenderId: $(\u0027HTTP Request Shotstack Render\u0027).item.json.response?.id || $(\u0027HTTP Request Shotstack Render\u0027).item.json.id, status: \u0027render_requested\u0027 } }}",
                                         "options":  {
                                                         "responseCode":  200
                                                     }
                                     },
                      "id":  "respond",
                      "name":  "Respond to Webhook",
                      "type":  "n8n-nodes-base.respondToWebhook",
                      "typeVersion":  1.5,
                      "position":  [
                                       940,
                                       100
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const http = require(\u0027http\u0027);\nconst https = require(\u0027https\u0027);\nconst { URL } = require(\u0027url\u0027);\nconst baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027);\nconst callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || \u0027\u0027);\nconst workflowRunId = Number($(\u0027Set Input\u0027).item.json.workflowRunId || 0);\nif (!baseUrl) throw new Error(\u0027APP_VIDEO_OPS_BACKEND_BASE_URL manquante\u0027);\nif (!callbackSecret) throw new Error(\u0027APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante\u0027);\nif (!workflowRunId) throw new Error(\u0027workflowRunId manquant\u0027);\nconst body = JSON.stringify({ status: \u0027SUCCEEDED\u0027, message: \u0027Render Shotstack demande.\u0027, responsePayload: JSON.stringify({ contentIdeaId: Number($(\u0027Set Input\u0027).item.json.contentIdeaId || 0), shotstackRenderId: $(\u0027HTTP Request Shotstack Render\u0027).item.json.response?.id || $(\u0027HTTP Request Shotstack Render\u0027).item.json.id || \u0027\u0027 }) });\nconst url = new URL(baseUrl + \u0027/api/video-ops/workflow-runs/\u0027 + workflowRunId + \u0027/complete\u0027);\nconst client = url.protocol === \u0027https:\u0027 ? https : http;\nconst sleep = (ms) =\u003e new Promise((resolve) =\u003e setTimeout(resolve, ms));\nlet response = null;\nlet lastError = null;\nfor (let attempt = 1; attempt \u003c= 6; attempt += 1) {\n  try {\n    response = await new Promise((resolve, reject) =\u003e {\n      const req = client.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === \u0027https:\u0027 ? 443 : 80), path: url.pathname + url.search, method: \u0027POST\u0027, headers: { \u0027Content-Type\u0027: \u0027application/json\u0027, \u0027Content-Length\u0027: Buffer.byteLength(body), \u0027X-Video-Ops-Callback-Secret\u0027: callbackSecret } }, (res) =\u003e { let data = \u0027\u0027; res.on(\u0027data\u0027, (chunk) =\u003e { data += chunk; }); res.on(\u0027end\u0027, () =\u003e resolve({ statusCode: res.statusCode || 0, body: data })); });\n      req.on(\u0027error\u0027, reject);\n      req.write(body);\n      req.end();\n    });\n    if (response.statusCode \u003e= 200 \u0026\u0026 response.statusCode \u003c 300) break;\n    lastError = \u0027Callback backend refuse: \u0027 + response.statusCode;\n    if (response.statusCode !== 404 || attempt === 6) throw new Error(lastError);\n  } catch (error) {\n    lastError = error.message || String(error);\n    if (attempt === 6) throw error;\n  }\n  await sleep(500 * attempt);\n}\nif (!response || response.statusCode \u003c 200 || response.statusCode \u003e= 300) throw new Error(lastError || \u0027Callback backend refuse.\u0027);\nreturn [{ json: { ...$json, callbackStatusCode: response.statusCode } }];"
                                     },
                      "id":  "callback",
                      "name":  "Callback Success",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       1180,
                                       100
                                   ]
                  }
              ],
    "connections":  {
                        "Webhook":  {
                                        "main":  [
                                                     [
                                                         {
                                                             "node":  "Set Input",
                                                             "type":  "main",
                                                             "index":  0
                                                         }
                                                     ]
                                                 ]
                                    },
                        "Set Input":  {
                                          "main":  [
                                                       [
                                                           {
                                                               "node":  "HTTP Request Image Prompt",
                                                               "type":  "main",
                                                               "index":  0
                                                           }
                                                       ]
                                                   ]
                                      },
                        "HTTP Request Image Prompt":  {
                                                          "main":  [
                                                                       [
                                                                           {
                                                                               "node":  "HTTP Request Pexels",
                                                                               "type":  "main",
                                                                               "index":  0
                                                                           }
                                                                       ]
                                                                   ]
                                                      },
                        "HTTP Request Pexels":  {
                                                    "main":  [
                                                                 [
                                                                     {
                                                                         "node":  "Select Portrait Media",
                                                                         "type":  "main",
                                                                         "index":  0
                                                                     }
                                                                 ]
                                                             ]
                                                },
                        "Select Portrait Media":  {
                                                      "main":  [
                                                                   [
                                                                       {
                                                                           "node":  "Backend Update Preparing",
                                                                           "type":  "main",
                                                                           "index":  0
                                                                       }
                                                                   ]
                                                               ]
                                                  },
                        "Backend Update Preparing":  {
                                                         "main":  [
                                                                      [
                                                                          {
                                                                              "node":  "HTTP Request Shotstack Render",
                                                                              "type":  "main",
                                                                              "index":  0
                                                                          }
                                                                      ]
                                                                  ]
                                                     },
                        "HTTP Request Shotstack Render":  {
                                                              "main":  [
                                                                           [
                                                                               {
                                                                                   "node":  "Backend Update Render Id",
                                                                                   "type":  "main",
                                                                                   "index":  0
                                                                               }
                                                                           ]
                                                                       ]
                                                          },
                        "Backend Update Render Id":  {
                                                         "main":  [
                                                                      [
                                                                          {
                                                                              "node":  "Respond to Webhook",
                                                                              "type":  "main",
                                                                              "index":  0
                                                                          }
                                                                      ]
                                                                  ]
                                                     },
                        "Respond to Webhook":  {
                                                   "main":  [
                                                                [
                                                                    {
                                                                        "node":  "Callback Success",
                                                                        "type":  "main",
                                                                        "index":  0
                                                                    }
                                                                ]
                                                            ]
                                               },
                        "Callback Success":  {
                                                 "main":  [

                                                          ]
                                             }
                    },
    "pinData":  {

                },
    "meta":  {
                 "templateCredsSetupCompleted":  true
             }
}

```

### n8n-local\script-live.json

```json
{
    "updatedAt":  "2026-05-02T13:48:24.882Z",
    "createdAt":  "2026-04-30T02:05:00.000Z",
    "id":  "25c5bac1-7098-43c5-a7dd-c6c8851c6ac8",
    "name":  "script-generation-single-llm",
    "description":  null,
    "active":  true,
    "isArchived":  false,
    "nodes":  [
                  {
                      "parameters":  {
                                         "httpMethod":  "POST",
                                         "path":  "script-generation",
                                         "responseMode":  "responseNode",
                                         "options":  {

                                                     }
                                     },
                      "id":  "webhook-script",
                      "name":  "Webhook",
                      "type":  "n8n-nodes-base.webhook",
                      "typeVersion":  2.1,
                      "position":  [
                                       -840,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "assignments":  {
                                                             "assignments":  [
                                                                                 {
                                                                                     "name":  "contentIdeaId",
                                                                                     "value":  "={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}",
                                                                                     "type":  "number"
                                                                                 },
                                                                                 {
                                                                                     "name":  "topic",
                                                                                     "value":  "={{ String($json.body.topic || $json.topic || \u0027\u0027).trim() }}",
                                                                                     "type":  "string"
                                                                                 },
                                                                                 {
                                                                                     "name":  "category",
                                                                                     "value":  "={{ String($json.body.category || $json.category || \u0027\u0027).trim() }}",
                                                                                     "type":  "string"
                                                                                 },
                                                                                 {
                                                                                     "name":  "workflowRunId",
                                                                                     "value":  "={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}",
                                                                                     "type":  "number"
                                                                                 }
                                                                             ]
                                                         },
                                         "options":  {

                                                     }
                                     },
                      "id":  "set-input",
                      "name":  "Set Input",
                      "type":  "n8n-nodes-base.set",
                      "typeVersion":  3.4,
                      "position":  [
                                       -600,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "POST",
                                         "url":  "https://api.groq.com/openai/v1/chat/completions",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "Authorization",
                                                                                         "value":  "={{ \u0027Bearer \u0027 + $env.GROQ_API_KEY }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ model: \u0027llama-3.3-70b-versatile\u0027, temperature: 0.7, messages: [ { role: \u0027system\u0027, content: \u0027Tu generes du contenu TikTok. Retourne uniquement un JSON valide avec les cles script, caption, background_keyword.\u0027 }, { role: \u0027user\u0027, content: \u0027Categorie: \u0027 + $json.category + \u0027\\nTopic: \u0027 + $json.topic + \u0027\\nContraintes:\\n- script: francais, naturel, court, pret pour une video TikTok\\n- caption: concise avec hashtags\\n- background_keyword: un seul mot-cle visuel exploitable\\nRetourne uniquement le JSON.\u0027 } ] }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "http-groq",
                      "name":  "HTTP Request Groq",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       -320,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const raw = String($json.choices?.[0]?.message?.content || \u0027\u0027).trim();\nconst cleaned = raw.replace(/^```json\\s*/i, \u0027\u0027).replace(/^```/i, \u0027\u0027).replace(/```$/i, \u0027\u0027).trim();\nlet parsed;\ntry { parsed = JSON.parse(cleaned); } catch (error) { throw new Error(\u0027Reponse LLM non parseable en JSON: \u0027 + cleaned); }\nreturn [{ json: { contentIdeaId: Number($(\u0027Set Input\u0027).item.json.contentIdeaId || 0), workflowRunId: Number($(\u0027Set Input\u0027).item.json.workflowRunId || 0), script: String(parsed.script || \u0027\u0027).trim(), caption: String(parsed.caption || \u0027\u0027).trim(), background_keyword: String(parsed.background_keyword || \u0027\u0027).trim() } }];"
                                     },
                      "id":  "code-parse",
                      "name":  "Parse JSON",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       -40,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "method":  "PATCH",
                                         "url":  "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027) + \u0027/api/video-ops/internal/content-ideas/\u0027 + $json.contentIdeaId }}",
                                         "sendHeaders":  true,
                                         "headerParameters":  {
                                                                  "parameters":  [
                                                                                     {
                                                                                         "name":  "Content-Type",
                                                                                         "value":  "application/json"
                                                                                     },
                                                                                     {
                                                                                         "name":  "X-Video-Ops-Internal-Secret",
                                                                                         "value":  "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"
                                                                                     }
                                                                                 ]
                                                              },
                                         "sendBody":  true,
                                         "specifyBody":  "json",
                                         "jsonBody":  "={{ JSON.stringify({ scripts: $json.script, script_status: \u0027done\u0027, caption: $json.caption, background_keyword: $json.background_keyword, pipeline_status: \u0027script_ready\u0027 }) }}",
                                         "options":  {

                                                     }
                                     },
                      "id":  "backend-update",
                      "name":  "Backend Update Script",
                      "type":  "n8n-nodes-base.httpRequest",
                      "typeVersion":  4.4,
                      "position":  [
                                       240,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "respondWith":  "json",
                                         "responseBody":  "={{ { ok: true, contentIdeaId: $(\u0027Parse JSON\u0027).item.json.contentIdeaId, workflowRunId: $(\u0027Parse JSON\u0027).item.json.workflowRunId, status: \u0027script_ready\u0027 } }}",
                                         "options":  {
                                                         "responseCode":  200
                                                     }
                                     },
                      "id":  "respond",
                      "name":  "Respond to Webhook",
                      "type":  "n8n-nodes-base.respondToWebhook",
                      "typeVersion":  1.5,
                      "position":  [
                                       480,
                                       120
                                   ]
                  },
                  {
                      "parameters":  {
                                         "jsCode":  "const http = require(\u0027http\u0027);\nconst https = require(\u0027https\u0027);\nconst { URL } = require(\u0027url\u0027);\nconst baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || \u0027\u0027).replace(/\\/+$/, \u0027\u0027);\nconst callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || \u0027\u0027);\nconst workflowRunId = Number($(\u0027Parse JSON\u0027).item.json.workflowRunId || 0);\nif (!baseUrl) throw new Error(\u0027APP_VIDEO_OPS_BACKEND_BASE_URL manquante\u0027);\nif (!callbackSecret) throw new Error(\u0027APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante\u0027);\nif (!workflowRunId) throw new Error(\u0027workflowRunId manquant\u0027);\nconst body = JSON.stringify({ status: \u0027SUCCEEDED\u0027, message: \u0027Script workflow termine.\u0027, responsePayload: JSON.stringify({ contentIdeaId: Number($(\u0027Parse JSON\u0027).item.json.contentIdeaId || 0) }) });\nconst url = new URL(baseUrl + \u0027/api/video-ops/workflow-runs/\u0027 + workflowRunId + \u0027/complete\u0027);\nconst client = url.protocol === \u0027https:\u0027 ? https : http;\nconst sleep = (ms) =\u003e new Promise((resolve) =\u003e setTimeout(resolve, ms));\nlet response = null;\nlet lastError = null;\nfor (let attempt = 1; attempt \u003c= 6; attempt += 1) {\n  try {\n    response = await new Promise((resolve, reject) =\u003e {\n      const req = client.request({ protocol: url.protocol, hostname: url.hostname, port: url.port || (url.protocol === \u0027https:\u0027 ? 443 : 80), path: url.pathname + url.search, method: \u0027POST\u0027, headers: { \u0027Content-Type\u0027: \u0027application/json\u0027, \u0027Content-Length\u0027: Buffer.byteLength(body), \u0027X-Video-Ops-Callback-Secret\u0027: callbackSecret } }, (res) =\u003e { let data = \u0027\u0027; res.on(\u0027data\u0027, (chunk) =\u003e { data += chunk; }); res.on(\u0027end\u0027, () =\u003e resolve({ statusCode: res.statusCode || 0, body: data })); });\n      req.on(\u0027error\u0027, reject);\n      req.write(body);\n      req.end();\n    });\n    if (response.statusCode \u003e= 200 \u0026\u0026 response.statusCode \u003c 300) break;\n    lastError = \u0027Callback backend refuse: \u0027 + response.statusCode;\n    if (response.statusCode !== 404 || attempt === 6) throw new Error(lastError);\n  } catch (error) {\n    lastError = error.message || String(error);\n    if (attempt === 6) throw error;\n  }\n  await sleep(500 * attempt);\n}\nif (!response || response.statusCode \u003c 200 || response.statusCode \u003e= 300) throw new Error(lastError || \u0027Callback backend refuse.\u0027);\nreturn [{ json: { ...$json, callbackStatusCode: response.statusCode } }];"
                                     },
                      "id":  "callback-success",
                      "name":  "Callback Success",
                      "type":  "n8n-nodes-base.code",
                      "typeVersion":  2,
                      "position":  [
                                       720,
                                       120
                                   ]
                  }
              ],
    "connections":  {
                        "Webhook":  {
                                        "main":  [
                                                     [
                                                         {
                                                             "node":  "Set Input",
                                                             "type":  "main",
                                                             "index":  0
                                                         }
                                                     ]
                                                 ]
                                    },
                        "Set Input":  {
                                          "main":  [
                                                       [
                                                           {
                                                               "node":  "HTTP Request Groq",
                                                               "type":  "main",
                                                               "index":  0
                                                           }
                                                       ]
                                                   ]
                                      },
                        "HTTP Request Groq":  {
                                                  "main":  [
                                                               [
                                                                   {
                                                                       "node":  "Parse JSON",
                                                                       "type":  "main",
                                                                       "index":  0
                                                                   }
                                                               ]
                                                           ]
                                              },
                        "Parse JSON":  {
                                           "main":  [
                                                        [
                                                            {
                                                                "node":  "Backend Update Script",
                                                                "type":  "main",
                                                                "index":  0
                                                            }
                                                        ]
                                                    ]
                                       },
                        "Backend Update Script":  {
                                                      "main":  [
                                                                   [
                                                                       {
                                                                           "node":  "Respond to Webhook",
                                                                           "type":  "main",
                                                                           "index":  0
                                                                       }
                                                                   ]
                                                               ]
                                                  },
                        "Respond to Webhook":  {
                                                   "main":  [
                                                                [
                                                                    {
                                                                        "node":  "Callback Success",
                                                                        "type":  "main",
                                                                        "index":  0
                                                                    }
                                                                ]
                                                            ]
                                               },
                        "Callback Success":  {
                                                 "main":  [

                                                          ]
                                             }
                    },
    "pinData":  {

                },
    "meta":  {
                 "templateCredsSetupCompleted":  true
             }
}

```

### n8n-local\config

```json
{
	"encryptionKey": "__SET_VIA_N8N_ENCRYPTION_KEY__"
}

```


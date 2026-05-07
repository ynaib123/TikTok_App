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

Dans la stack Docker principale :

- `frontend` tourne avec Vite dans le conteneur et recharge les changements via bind mount
- `backend` tourne avec Spring Boot DevTools : reload du contexte en ~5-10 s sur modification d'un fichier `.java`, sans redemarrer la JVM
- `n8n` avec montage des workflows locaux

Le `docker-compose.yml` racine est l'unique stack dev/prod-like ; il y a quelques petites bascules par variables d'env (`SPRING_PROFILES_ACTIVE=dev` reduit le boot a ~25 s).

## Configuration backend video ops

Variables backend recommandees pour un fonctionnement complet :

```properties
POSTGRES_PASSWORD=...
APP_ADMIN_PASSWORD=...
APP_JWT_SECRET=...
N8N_ENCRYPTION_KEY=...
APP_ALLOWED_ORIGINS=http://localhost:5174,https://<ton-host-ngrok>
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
- les webhooks `n8n` ne se configurent plus dans `.env` : le backend utilise maintenant la connexion `n8n` active enregistree dans la page `Accounts`.
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

La page `Accounts` ne propose plus de connexion `Supabase`, car elle n est plus utilisee par les workflows courants.

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

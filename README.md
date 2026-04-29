# TikTok App

Projet local compose de :

- `Backend/` : API Spring Boot pour l authentification admin et les endpoints backoffice
- `Frontend/admin/` : backoffice React/Vite
- `supabase/` : scripts SQL utilitaires pour les acces video ops
- `docker-compose.yml` : PostgreSQL + backend Spring

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

Compte admin cree automatiquement :

- email : `admin@tiktokapp.local`
- mot de passe : `admin123`

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
```

Notes importantes :

- `VITE_API_BASE_URL=/api` permet d utiliser le proxy Vite et evite les problemes CSRF en local
- `VITE_BACKEND_PROXY_TARGET` doit pointer vers le backend Spring local
- `VITE_ALLOWED_HOSTS` est utile si tu ouvres le frontend via `ngrok` ou un autre host externe
- le frontend admin ne doit plus appeler directement Supabase ou les webhooks `n8n`

## Configuration backend video ops

Variables backend recommandees pour un fonctionnement complet :

```properties
APP_ALLOWED_ORIGINS=http://localhost:5174,https://<ton-host-ngrok>
APP_VIDEO_OPS_SUPABASE_URL=https://<project>.supabase.co
APP_VIDEO_OPS_SUPABASE_SERVICE_ROLE_KEY=...
APP_VIDEO_OPS_N8N_MAIN_PIPELINE_WEBHOOK=...
APP_VIDEO_OPS_N8N_CHECK_SHOTSTACK_WEBHOOK=...
APP_VIDEO_OPS_N8N_RENDER_TEMPLATE_WEBHOOK=...
APP_VIDEO_OPS_N8N_PUBLISH_TIKTOK_WEBHOOK=...
APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET=...
APP_VIDEO_OPS_TIKTOK_CLIENT_KEY=...
APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET=...
APP_VIDEO_OPS_TIKTOK_REDIRECT_URI=https://ai-video-publisher.vercel.app/tiktok-callback
APP_VIDEO_OPS_TIKTOK_OAUTH_SCOPES=user.info.basic,video.publish
APP_VIDEO_OPS_ALLOWED_SHOTSTACK_HOSTS=shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com
APP_VIDEO_OPS_ALLOWED_UPLOAD_HOSTS=open-upload.tiktokapis.com,open.tiktokapis.com,business-api.tiktok.com
```

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

## Video Ops et Supabase

Le backoffice passe maintenant par le backend Spring pour :

- `public.content_ideas`
- `public.tiktok_accounts`
- les mises a jour de pipeline
- les declenchements `n8n`

Le backend utilise la `service role key` Supabase pour lire et mettre a jour ces donnees cote serveur.

Si tu veux simplement debloquer un ancien front qui lisait Supabase directement, il reste un script legacy :

- `supabase/rls_video_ops_read_access.sql`

Ce script ouvre la lecture `anon` pour ces deux tables afin que le frontend puisse les lire.

Attention :

- cette solution est uniquement legacy / secours local
- pour une version securisee, garde le mode actuel `frontend -> backend Spring -> Supabase/n8n`

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
- `POST /api/video-ops/tiktok-oauth/authorize`
- `POST /api/video-ops/tiktok-oauth/callback`
- `POST /api/video-ops/workflows/main-pipeline`
- `POST /api/video-ops/workflows/check-shotstack`
- `POST /api/video-ops/workflows/render-template`
- `POST /api/video-ops/workflows/init-publish`
- `GET /api/video-ops/workflow-runs/{id}`
- `POST /api/video-ops/workflow-runs/{id}/complete`
- `POST /api/video-ops/content-ideas/{id}/upload`
- `POST /api/video-ops/content-ideas/{id}/publish`

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

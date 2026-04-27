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
VITE_SUPABASE_URL=https://tsigpydyxddbqckeeush.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=/api
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:8080
VITE_USE_MOCK_ADMIN_AUTH=false
VITE_N8N_MAIN_PIPELINE_WEBHOOK=...
VITE_N8N_CHECK_SHOTSTACK_WEBHOOK=...
VITE_N8N_PUBLISH_TIKTOK_WEBHOOK=...
```

Notes importantes :

- `VITE_API_BASE_URL=/api` permet d utiliser le proxy Vite et evite les problemes CSRF en local
- `VITE_BACKEND_PROXY_TARGET` doit pointer vers le backend Spring local

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

Le backoffice lit directement :

- `public.content_ideas`
- `public.tiktok_accounts`

Si les tables contiennent des donnees mais que le backoffice affiche `0 rows`, execute le script :

- `supabase/rls_video_ops_read_access.sql`

Ce script ouvre la lecture `anon` pour ces deux tables afin que le frontend puisse les lire.

Attention :

- cette solution est pratique pour le local et le backoffice actuel
- pour une version plus securisee, il faudra faire transiter ces lectures par le backend Spring

## Endpoints backend utiles

Admin auth :

- `GET /api/admins/csrf-token`
- `POST /api/admins/login`
- `POST /api/admins/refresh`
- `POST /api/admins/logout`

TikTok upload :

- `POST /api/tiktok/upload`

## Scripts frontend admin

Depuis `Frontend/admin` :

```bash
npm run dev
npm run build
npm run test
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

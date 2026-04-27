# MyShop Client Desktop Frontend

Cette application correspond au storefront desktop/client.

Arborescence cible du projet :

- `clientdesktop/frontend/` : storefront client
- `admin/frontend/` : back-office admin
- `clientmobile/frontend/` : future application mobile
- `backend/` : API Spring Boot

## Stack

- React 19
- React Router 7
- Vite 7
- ESLint 9

## Lancer en local

```bash
cd clientdesktop/frontend
npm install
npm run dev
```

Storefront : `http://localhost:5173`

## Scripts

Storefront :

```bash
npm run dev
npm run build
npm run lint
```

## Auth

Le frontend gère :

- access token Bearer
- refresh token
- bootstrap de session au chargement
- refresh automatique sur expiration ou `401`

Endpoints attendus :

```text
POST /api/clients/login
POST /api/clients/refresh
POST /api/clients/logout
POST /api/admins/login
POST /api/admins/refresh
POST /api/admins/logout
```

## Variables d’environnement

Storefront :

```text
VITE_API_BASE_URL=/api
VITE_ADMIN_APP_URL=http://localhost:5174
```

## Architecture

```text
src/
├── components/
├── contexts/
├── hooks/
├── pages/
├── services/
├── styles/
└── utils/

```

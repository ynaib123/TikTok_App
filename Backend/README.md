# TikTok App Backend

Backend Spring Boot minimal pour l'auth admin du backoffice.

Le projet parent contient un `docker-compose.yml` pour lancer :

- PostgreSQL
- le backend Spring

## Endpoints

- `GET /api/admins/csrf-token`
- `POST /api/admins/login`
- `POST /api/admins/refresh`
- `POST /api/admins/logout`

## Variables utiles

```properties
APP_ADMIN_EMAIL=admin@tiktokapp.local
APP_ADMIN_PASSWORD=admin123
APP_ADMIN_NAME=Video Ops Admin
APP_JWT_SECRET=change-this-secret-before-production-1234567890
APP_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://192.168.11.100:5174
APP_SECURE_COOKIES=false
PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/tiktok_app
SPRING_DATASOURCE_USERNAME=tiktok_app
SPRING_DATASOURCE_PASSWORD=tiktok_app
```

## Frontend

Dans `C:\TikTok_App\Frontend\admin\.env.local` :

```properties
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK_ADMIN_AUTH=false
```

## Lancement avec Docker Desktop

Depuis `C:\TikTok_App` :

```bash
docker compose up --build -d
```

Le backend sera disponible sur `http://localhost:8080` et le premier admin sera cree automatiquement en base avec :

- email : `admin@tiktokapp.local`
- mot de passe : `admin123`

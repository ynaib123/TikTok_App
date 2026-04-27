# TikTok App

Organisation actuelle :

- `Backend/` : API Spring Boot pour le login admin
- `Frontend/admin/` : backoffice React
- `docker-compose.yml` : PostgreSQL + backend Spring

## Lancement backend + base

```bash
cd C:\TikTok_App
docker compose up --build -d
```

## Lancement du backoffice admin

```bash
cd C:\TikTok_App\Frontend\admin
npm install
npm run dev
```

## Notes

- Les boutons `n8n` du dashboard pointent vers les webhooks de production, mais les workflows doivent etre **actifs** dans `n8n`.
- Le login admin utilise maintenant une vraie base PostgreSQL Docker.

# Backup & restore

## What `Backend/tools/backup-stack.ps1` captures

Each run creates a timestamped folder under `backups/<yyyyMMdd-HHmmss>/`:

- `postgres-tiktok_app.sql.gz` — full pg_dump of the application database (schema + data)
- `n8n-database.sqlite` — n8n's SQLite store (credentials, executions, workflow definitions)
- `n8n-config` — n8n config file (contains the encryption key used for credentials)
- `n8n-workflows/all.json` — n8n CLI JSON export of every workflow

The script also prunes folders older than `-RetainDays` (default 14).

## Run the backup

```powershell
./Backend/tools/backup-stack.ps1
```

Optional flags:

```powershell
./Backend/tools/backup-stack.ps1 `
    -OutputDir D:/tiktok-backups `
    -RetainDays 30
```

Schedule it via Windows Task Scheduler or a cron-equivalent on the host.
**Don't commit the `backups/` directory** — it's already gitignored.

## Restore Postgres

```powershell
$dump = "backups/<timestamp>/postgres-tiktok_app.sql.gz"
docker exec -i tiktok-app-postgres sh -c "gunzip | psql -U tiktok_app -d tiktok_app" < $dump
```

After the restore, restart the backend so JPA picks up the schema:

```powershell
docker compose restart backend
```

Flyway will run on startup and detect the `flyway_schema_history` table is already in sync.

## Restore n8n

n8n keeps **credentials encrypted at rest** with the key in `n8n-config`. You must restore *both* the SQLite DB and the config file together, or credentials will be unreadable.

```powershell
$src = "backups/<timestamp>"
docker cp "$src/n8n-database.sqlite" tiktok-app-n8n:/home/node/.n8n/database.sqlite
docker cp "$src/n8n-config"          tiktok-app-n8n:/home/node/.n8n/config
docker restart tiktok-app-n8n
```

If you only need the workflows (not credentials/executions), a lighter restore is:

```powershell
./Backend/tools/publish-n8n-workflows.ps1
```

That re-imports the JSON committed under `Backend/tools/n8n-workflows/`.

## Disaster recovery drill

Once a quarter, simulate the worst case on a sandbox host:

1. `docker compose down -v` to wipe volumes.
2. `docker compose up -d` to recreate empty containers.
3. Run the Postgres + n8n restore steps above with the most recent backup.
4. Run the TikTok smoke E2E (`PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E=true npm run test:e2e -- tiktok-journey.spec.js`).
5. Time the whole drill. The target is **under 15 minutes** from wipe to green E2E.

If the drill fails, the backup is not valid. Fix it before going further.

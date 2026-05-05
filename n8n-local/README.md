# n8n-local — runtime working directory (NOT a source of truth)

This folder hosts the **local n8n runtime state**:

- `database.sqlite` — n8n's local DB (workflows, credentials, executions).
- `nodes/`, `storage/`, `config` — runtime artefacts.
- `*.json` files (`check-live.json`, `init-live.json`, `idea-script-fused.json`, `render-live.json`)
  are **imported snapshots** of what is currently active in the local n8n instance.

> ⚠️ Do **not** edit these JSON files by hand and commit them as the canonical version.
> They are derived from the local DB and exist only to make the runtime state inspectable.

## Canonical source of truth

Workflow definitions are owned by:

```
Backend/tools/n8n-workflows/
├── check-shotstack.json
├── idea-script-fused.json
├── init-publish-tiktok.json
└── render-template-video.json
```

Why there?
- Versioned alongside the Spring Boot backend that calls them — same review/PR cycle.
- Exported with full n8n metadata (`id`, `versionId`, `versionCounter`, `tags`, `shared`).
- Single repo location for CI to validate (JSON shape, header contract version, …).

## Sync workflow

`Backend/tools/publish-n8n-workflows.ps1` is the single sync entry point.

```powershell
# Import canonical workflows from Backend/tools/n8n-workflows/ into the local
# n8n container (and activate them).
pwsh Backend/tools/publish-n8n-workflows.ps1

# Re-export from local n8n into the canonical folder (after iterating in the
# n8n UI). Always commit the resulting diff in Backend/tools/n8n-workflows/.
pwsh Backend/tools/publish-n8n-workflows.ps1 -Export
```

The script knows the four canonical workflow IDs and refuses to silently lose
work — if a file is missing on either side, it stops.

If a `*-live.json` snapshot in this folder drifts from the canonical export,
treat the canonical export as authoritative and re-run the import.

## Files in this folder you can ignore for governance

| File | Purpose |
| --- | --- |
| `database.sqlite*` | n8n local SQLite (DO NOT commit) |
| `*.bak-*` | manual backup snapshots |
| `n8nEventLog*.log` | n8n event journal |
| `backup-before-codex-import/` | one-off recovery backup |

These are runtime-only — keep them in `.gitignore` if not already.

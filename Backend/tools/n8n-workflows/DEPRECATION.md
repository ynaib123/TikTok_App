# n8n workflows — état de migration (Phase 7)

| Workflow | Statut | Notes |
|---|---|---|
| `render-template-video.json` | **DEPRECATED (legacy Shotstack)** | Conservé comme fallback pendant la transition. Ne plus modifier sauf fix critique. À archiver après 14 jours sans régression Remotion en prod. |
| `render-template-video-remotion.json` | **ACTIVE (cible)** | Lit `templateId` + `qualityProfile` du payload backend, persiste `thumbnail_url`, `render_engine`, `quality_profile` sur `content_ideas`. |
| autres workflows (`script-*`, `init-publish-tiktok`, `tiktok-upload`, `notify-stuck-runs`, ...) | ACTIVE | Non concernés par la migration de moteur. |

## Bascule

Voir `MIGRATION_RUNBOOK.md` à la racine du repo.

```
APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video           # legacy Shotstack
APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video-remotion  # nouveau Remotion
```

## Outil de comparaison

```
node Backend/tools/compare-render-engines.mjs --idea <id>
```

Lance deux renders consécutifs et compare durée / taille / content-type / thumbnail.

## Nettoyage final

À n'exécuter qu'après validation prod stable :
1. Désactiver `render-template-video.json` dans n8n UI (toggle off, ne pas supprimer).
2. `git mv render-template-video.json _archive/render-template-video.json`.
3. Supprimer `ShotstackRenderClient` du backend si plus aucun appel.
4. Backfill SQL : `UPDATE content_ideas SET render_engine='shotstack' WHERE render_engine IS NULL AND shotstack_url IS NOT NULL;`

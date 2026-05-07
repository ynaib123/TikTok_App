# Migration Runbook — Shotstack → Remotion

Phase 7 du chantier `VIDEO_RENDER_MIGRATION_PROGRESS.md`.

Ce document décrit comment basculer le rendu vidéo de Shotstack à Remotion, comment valider en sous-ensemble, et comment revenir en arrière. **Aucune destruction n'est entreprise tant que les étapes 1–4 n'ont pas été validées en production.**

## TL;DR

```
APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video           # legacy Shotstack
APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video-remotion  # nouveau Remotion
```

Le backend, n8n et les deux workflows coexistent. Pas de redéploiement nécessaire pour la bascule, juste un changement d'env + un restart backend.

## Prérequis

- Service `RenderVideo` démarré et atteignable depuis n8n.
- `APP_RENDER_VIDEO_PUBLIC_BASE_URL` est une URL HTTPS publique (sinon TikTok refuse l'upload).
- Le host HTTPS de `APP_RENDER_VIDEO_PUBLIC_BASE_URL` est listé dans `APP_VIDEO_OPS_ALLOWED_SHOTSTACK_HOSTS`.
- `ffmpeg-static` est embarqué dans l'image `RenderVideo`. Pas de binaire système à fournir.
- Migration SQL `V8__render_quality_profile.sql` appliquée (Flyway s'en charge au démarrage backend).
- Workflows n8n importés:
  - `Backend/tools/n8n-workflows/render-template-video.json` (legacy, gardé en fallback)
  - `Backend/tools/n8n-workflows/render-template-video-remotion.json` (Remotion)

## 1. Activation Remotion sur un sous-ensemble

Plusieurs stratégies possibles. La plus simple :

### 1a. Bascule globale (toutes nouvelles idées)

```bash
# Sur l'instance backend cible
export APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video-remotion
systemctl restart tiktokapp-backend  # ou docker compose restart backend
```

Toutes les nouvelles requêtes `/api/video-ops/workflows/render-template` partent vers le workflow Remotion. Les renders Shotstack en cours ne sont pas affectés (le run a déjà été dispatché).

### 1b. Bascule par compte / catégorie (optionnel)

Le payload backend transmet maintenant `templateId` et `qualityProfile`. Pour une approche plus granulaire :

1. Garder `APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video` (Shotstack par défaut).
2. Ajouter un workflow n8n routeur qui inspecte `category` ou `tiktokAccountOpenId` et redirige vers `render-template-video-remotion` pour les sous-ensembles ciblés.

Cette stratégie n'est pas implémentée en standard — à activer si nécessaire.

## 2. Validation post-bascule

Pour chaque catégorie clé (`Food`, `Love`, `Sport`, `Fitness`, `Beauty`) :

1. Créer une idée via le parcours admin en sélectionnant chaque template (`tiktok-pro-vertical`, `tiktok-bold-story`, `tiktok-clean-minimal`) et chaque qualité (`draft`, `standard`, `high`, `premium`).
2. Vérifier dans le backoffice :
   - le moteur affiché passe à `REMOTION`
   - la thumbnail apparaît dans la side card du step "Video"
   - la vidéo se rend en moins de 6 minutes (`premium`) ou 2 minutes (`standard`)
3. Lancer la publication TikTok pour valider que `shotstack_url` reste compatible avec l'upload TikTok (URL HTTPS, content-type `video/mp4`).

### Comparaison automatisée

```bash
export APP_VIDEO_OPS_BACKEND_BASE_URL=https://backend.example.com
export APP_VIDEO_OPS_BACKEND_TOKEN="$(curl -s ... | jq -r .accessToken)"

# Run 1 - Shotstack (avec APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video)
node Backend/tools/compare-render-engines.mjs --idea 123 > shotstack.md

# Restart backend avec APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video-remotion
node Backend/tools/compare-render-engines.mjs --idea 123 > remotion.md

diff shotstack.md remotion.md
```

Le script déclenche deux renders, attend la complétion, lit `shotstack_url`/`thumbnail_url` post-callback et fait un HEAD pour comparer taille + content-type.

## 3. Métriques à surveiller

| Métrique | Source | Seuil d'alerte |
|---|---|---|
| Durée moyenne render | `video_workflow_runs.completed_at - created_at` (workflow_type = RENDER_TEMPLATE_VIDEO) | > 8 minutes p95 |
| Taux d'échec render | `video_workflow_runs.status = 'FAILED'` / total | > 3 % sur 24h |
| Taille MP4 | `compare-render-engines.mjs` content-length | < 800 KB ou > 30 MB |
| Loudness | post-process logs `loudnessNormalized=true` | toujours `true` quand voiceover présent |
| TikTok upload | `tiktok_upload_status = 'failed'` | spike vs baseline Shotstack |

Le workflow n8n alerte via `notify-stuck-runs` si un run RENDER_TEMPLATE_VIDEO reste en ACCEPTED > 15 min.

## 4. Rollback

```bash
export APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video
systemctl restart tiktokapp-backend
```

Aucune migration de données n'est à dérouler. Les colonnes `quality_profile`, `render_engine`, `thumbnail_url` ajoutées par `V8` peuvent rester. Les anciens renders Shotstack auront `render_engine = NULL` (ou `'shotstack'` si on les backfill).

Pour les idées déjà rendues via Remotion, on peut relancer un render Shotstack en relançant `triggerRenderTemplate` avec `force=true` après la bascule. La colonne `shotstack_url` sera écrasée.

## 5. Nettoyage final (à n'exécuter qu'après stabilité prouvée)

**N'exécuter qu'après 14 jours minimum sans régression Remotion en production.**

```bash
# 1. Désactiver le workflow Shotstack dans n8n (sans le supprimer)
# 2. Supprimer le bind APP_VIDEO_OPS_N8N_RENDER_PATH (la valeur par défaut deviendra Remotion)
# 3. Renommer/archiver les fichiers legacy:
git mv Backend/tools/n8n-workflows/render-template-video.json Backend/tools/n8n-workflows/_archive/render-template-video.json
# 4. Supprimer la classe ShotstackRenderClient (Backend) et les hosts Shotstack de allowed-shotstack-hosts si plus utilisés
# 5. Migration SQL pour backfill render_engine='shotstack' sur les anciennes lignes
```

Cette étape n'est PAS automatisée. Elle doit être faite par un humain après revue.

## 6. Annexes

### Templates Remotion

| templateId | Description | Sous-titres par défaut |
|---|---|---|
| `tiktok-pro-vertical` | Hook badge + script + CTA, palette par catégorie | line |
| `tiktok-bold-story` | Display italic, chapitres numérotés, CTA dégradé | word |
| `tiktok-clean-minimal` | Capsule discrète, bandeau central | line |

### Profils de qualité

| Profil | Preset libx264 | CRF | Audio | Cible usage |
|---|---|---|---|---|
| draft | veryfast | 28 | 96 kbps | preview / itération |
| standard | fast | 24 | 128 kbps | A/B testing |
| high | medium | 21 | 160 kbps | publication par défaut |
| premium | slow | 19 | 192 kbps | featured / paid posts |

### Variables d'environnement clés

| Variable | Valeur | Effet |
|---|---|---|
| `APP_VIDEO_OPS_N8N_RENDER_PATH` | `/webhook/render-template-video-remotion` | Active Remotion |
| `APP_RENDER_VIDEO_PUBLIC_BASE_URL` | URL HTTPS publique | Sortie MP4 accessible TikTok |
| `APP_VIDEO_OPS_ALLOWED_SHOTSTACK_HOSTS` | inclure le host de la base ci-dessus | Le service upload n'accepte que les hôtes autorisés |
| `APP_VIDEO_OPS_N8N_READ_TIMEOUT_MS` | `600000` | Tolère les renders Remotion `premium` |
| `FFMPEG_BIN_PATH` (RenderVideo) | optionnel | Surcharge le ffmpeg-static embarqué |

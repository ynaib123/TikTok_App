# Phase 1: Audit du pipeline video et contrat de rendu cible

## Objectif

Cette phase ne change pas encore le moteur de rendu.
Elle fige:

- le pipeline actuel reellement utilise
- les donnees d'entree reellement consommees pour un rendu
- les manques a combler avant migration vers `Remotion + FFmpeg`
- un contrat JSON unique de rendu video

## Pipeline actuel

### 1. Generation idee + script

Frontend:
- [TikTokJourneyPage.tsx](Frontend/admin/src/pages/TikTokJourneyPage.tsx)
- [useTikTokJourneySteps.ts](Frontend/admin/src/pages/tiktok-journey/useTikTokJourneySteps.ts)

API backend:
- `POST /api/video-ops/workflows/main-pipeline`

Workflow n8n:
- [idea-script-fused.json](Backend/tools/n8n-workflows/idea-script-fused.json)

Payload utile:
- `category`
- `ideaCount`
- `tiktokAccountOpenId`
- `source`
- `force`

Sortie utile:
- creation `content_idea`
- `topic`
- `script`
- `caption`
- `keyword`

### 2. Rendu video

Frontend:
- `triggerRenderTemplateWorkflow(...)`

API backend:
- `POST /api/video-ops/workflows/render-template`

Backend:
- [WorkflowTriggerRequest.java](Backend/src/main/java/com/tiktokapp/backend/dto/videoops/WorkflowTriggerRequest.java)
- [VideoOpsService.java](Backend/src/main/java/com/tiktokapp/backend/service/videoops/VideoOpsService.java)

Workflow n8n:
- [render-template-video.json](Backend/tools/n8n-workflows/render-template-video.json)

Source de verite actuelle:
- le frontend envoie `contentIdeaId`, `topic`, `script`, `caption`, `keyword`
- si certains champs manquent, le backend les recharge depuis `content_ideas`
- le backend injecte aussi `workflowRunId` et `idempotencyKey`

Etapes n8n reelles:
1. validation de l'entree
2. derivation du `hook`
3. generation d'une `aesthetic` via LLM
4. recherche de media portrait Pexels
5. scoring du media
6. mise a jour backend avec `render_payload`, `media_score`, `media_quality`
7. appel Shotstack
8. sauvegarde du `shotstack_render_id`
9. callback backend de completion

### 3. Preparation publication TikTok

Frontend:
- `triggerPublishTikTokWorkflow(...)`

API backend:
- `POST /api/video-ops/workflows/init-publish`

Workflow n8n:
- [init-publish-tiktok.json](Backend/tools/n8n-workflows/init-publish-tiktok.json)

Contexte reconstitue par backend:
- `accessToken`
- `title`
- `shotstackUrl`
- `selectedPrivacyLevel`

### 4. Upload reel

Frontend:
- `uploadTikTokMedia(...)`

API backend:
- `POST /api/video-ops/content-ideas/{id}/upload`

Payload utile:
- `shotstackUrl`
- `uploadUrl`
- `force`

### 5. Finalisation publication

API backend:
- `POST /api/video-ops/content-ideas/{id}/publish`

Effet:
- marque la publication finale dans l'app

## Entrees video reellement consommees aujourd'hui

Le workflow de rendu actuel consomme effectivement:

### Donnees metier

- `contentIdeaId`
- `topic`
- `script`
- `caption`
- `keyword`
- `tiktokAccountOpenId` seulement de maniere indirecte dans le pipeline global

### Donnees techniques

- `workflowRunId`
- `idempotencyKey`
- `source`
- `requestedBy`
- `requestedAt`

### Donnees derivees dans n8n

- `hook` derive de la premiere phrase du script
- `aesthetic` derive par LLM
- `background_video_url` choisi via Pexels
- `media_score`
- `media_quality`
- `media_duration`
- `media_resolution`

### Donnees absentes du contrat actuel

Elles sont importantes pour un rendu niveau pro, mais non explicites aujourd'hui:

- `templateId`
- `durationSec`
- `fps`
- `width` / `height`
- `brand profile`
- `caption segments` temporises
- `voiceOver`
- `music`
- `safe zones`
- `scene list`
- `cta`
- `visual style`
- `asset manifest` complet

## Probleme du pipeline actuel

### Ce qui marche

- orchestration backend/n8n deja propre
- tracking via `workflowRunId`
- idempotence de base
- publication TikTok deja separee du rendu

### Ce qui bloque une qualite pro

1. Le contrat de rendu n'est pas un vrai contrat produit.
Le moteur deduit trop de choses au lieu de recevoir une spec claire.

2. La selection media est enfouie dans n8n.
Le rendu n'a pas de `asset manifest` stable et rejouable.

3. Le rendu ne connait pas explicitement:
- la duree cible
- les scenes
- la strategie de sous-titres
- le style template
- les couches audio

4. Shotstack recoit un payload final tres pauvre:
- une seule video de fond
- 1 a 3 blocs texte
- peu de controle typographique et motion

## Contrat cible propose

Schema JSON versionne:
- [render-video-job.schema.json](Backend/tools/contracts/render-video-job.schema.json)

### Principes

1. Le backend/n8n preparent un `render job`.
2. Le moteur de rendu ne devine pas les intentions produit.
3. Le contrat doit etre stable quel que soit le moteur:
- Shotstack
- Remotion
- futur renderer interne

### Structure cible

- `contractVersion`
- `workflowRunId`
- `contentIdeaId`
- `source`
- `requestedAt`
- `idea`
- `account`
- `render`
- `assets`
- `publication`

## Mapping actuel -> contrat cible

### Champs deja disponibles aujourd'hui

- `contentIdeaId` -> `contentIdeaId`
- `workflowRunId` -> `workflowRunId`
- `topic` -> `idea.topic`
- `script` -> `idea.script`
- `caption` -> `idea.caption`
- `keyword` -> `idea.keyword`
- `hook` derive -> `idea.hook`
- `tiktokAccountOpenId` -> `account.openId`
- media Pexels choisi -> `assets.backgroundVideo`
- `media_duration` -> `assets.backgroundVideo.durationSec`
- `media_resolution` -> `assets.backgroundVideo.width/height`

### Champs a introduire des la phase 2

- `render.templateId`
- `render.durationSec`
- `render.fps`
- `render.width`
- `render.height`
- `render.qualityProfile`
- `render.captionMode`
- `render.sceneStrategy`
- `assets.voiceover`
- `assets.music`
- `assets.captions`
- `assets.overlays`
- `publication.title`
- `publication.privacyLevel`

## Decision de phase 1

Le contrat de rendu cible pour la migration pro sera:

- un contrat unique
- versionne
- decouple du moteur de rendu
- suffisamment riche pour `Remotion`
- utilisable encore temporairement par Shotstack si besoin

## Definition de done de la phase 1

- pipeline actuel audite
- entrees reelles de rendu identifiees
- ecarts vers une architecture pro listes
- schema JSON de contrat cree et versionne

## Etape suivante recommandee

Phase 2:
- creer un service `render-video` Remotion
- accepter directement ce contrat
- produire un premier template vertical `9:16`
- garder Shotstack en fallback pendant la transition

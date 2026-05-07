# Video Render Migration Progress

Derniere mise a jour: 2026-05-07 (Phases 6 + 7)

Objectif:
- migrer progressivement du pipeline actuel `n8n + Shotstack + upload TikTok`
- vers une architecture plus pro `n8n + Remotion + FFmpeg + TikTok API`
- sans casser le parcours admin ni la publication existante

Statut global:
- [x] Phase 1 terminee: audit + contrat de rendu
- [x] Phase 2 terminee: service de rendu Remotion
- [x] Phase 3 terminee: branchement n8n optionnel vers Remotion
- [x] Phase 4 terminee: templates premium
- [x] Phase 5 terminee: finition FFmpeg
- [x] Phase 6 terminee: amelioration backoffice
- [x] Phase 7 preparee: outils de comparaison + runbook (nettoyage legacy NON execute, decision prod)

## Architecture cible

Architecture actuelle:
- `Frontend/admin`: parcours TikTok et declenchement des workflows backend
- `Backend`: endpoints `video-ops`, orchestration des `workflowRun`, callbacks, tracking et upload TikTok
- `n8n`: generation idee/script, rendu Shotstack, init publish TikTok
- `Shotstack`: moteur de rendu actuel
- `TikTok API`: init publish + upload

Architecture cible:
- `Frontend/admin`: meme parcours, puis preview plus fidele, choix template et reglages premium
- `Backend`: contrat unique de rendu video, orchestration stable, proxy interne vers le moteur actif
- `n8n`: orchestration metier, enrichissement, selection d'assets, callbacks
- `RenderVideo`: nouveau service dedie, entree JSON versionnee, moteur principal Remotion
- `FFmpeg`: post-processing final, normalisation audio, compression et finition
- `TikTok API`: publication finale

Decision technique:
- garder Shotstack comme fallback pendant la migration initiale
- activer Remotion via un workflow n8n alternatif, sans retirer le workflow legacy
- ne pas relacher la securite de publication TikTok: l'URL finale doit rester HTTPS pour un vrai upload

## Phase 1 - Audit et contrat de rendu

But:
- comprendre le pipeline actuel
- figer un contrat d'entree stable pour le futur moteur de rendu

Taches:
- [x] auditer les flux frontend qui declenchent le rendu
- [x] auditer les endpoints backend impliques
- [x] auditer les workflows n8n de rendu et publication
- [x] identifier les champs reellement utilises aujourd'hui
- [x] lister les gaps entre pipeline actuel et niveau pro vise
- [x] definir un contrat JSON cible versionne
- [x] stocker l'analyse dans le repo

Livrables:
- [PHASE1_RENDER_MIGRATION.md](/C:/TikTok_App/PHASE1_RENDER_MIGRATION.md)
- [render-video-job.schema.json](/C:/TikTok_App/Backend/tools/contracts/render-video-job.schema.json)

## Phase 2 - Service de rendu Remotion

But:
- creer un service `RenderVideo` independant
- accepter le contrat JSON cible
- produire un premier rendu vertical `9:16`

Taches:
- [x] choisir l'emplacement du service dans le repo: `RenderVideo/`
- [x] scaffold du service Node/TypeScript
- [x] installer Remotion
- [x] exposer `GET /health`
- [x] exposer `POST /render`
- [x] parser et valider `render-video-job.schema.json`
- [x] creer un template vertical premium minimal `tiktok-pro-vertical`
- [x] supporter un fond video
- [x] supporter un hook
- [x] supporter du texte principal derive du script
- [x] supporter un CTA
- [x] exporter en MP4 H.264
- [x] retourner `renderId`, `outputUrl`, `outputPath`, dimensions, fps et duree
- [x] documenter le service et son contrat d'entree/sortie

Livrables:
- [RenderVideo/README.md](/C:/TikTok_App/RenderVideo/README.md)
- [RenderVideo/src/server.ts](/C:/TikTok_App/RenderVideo/src/server.ts)
- [RenderVideo/src/remotion/TikTokProVertical.tsx](/C:/TikTok_App/RenderVideo/src/remotion/TikTokProVertical.tsx)
- [RenderVideo/Dockerfile](/C:/TikTok_App/RenderVideo/Dockerfile)

Notes:
- le service telecharge les assets distants cote serveur avant rendu
- les assets telecharges sont servis via `/renders/assets/...` pour eviter les problemes `file://` avec Remotion/Chromium
- `RENDER_VIDEO_PUBLIC_BASE_URL` controle l'URL retournee au backend/n8n

## Phase 3 - Branchement n8n vers le nouveau renderer

But:
- faire produire le contrat de rendu par le pipeline
- appeler le nouveau service Remotion sans supprimer Shotstack

Taches:
- [x] creer une transformation `content idea -> render job` dans le workflow n8n Remotion
- [x] adapter le workflow n8n de rendu via un nouveau workflow dedie
- [x] conserver `workflowRunId`
- [x] conserver `idempotencyKey`
- [x] sauvegarder `render_payload` cote backend via le workflow
- [x] brancher les callbacks de fin de rendu
- [x] garder la possibilite de bascule `Shotstack` / `Remotion`
- [x] exposer un proxy backend interne vers `RenderVideo`
- [x] ajouter la configuration Docker Compose du service

Livrables:
- [render-template-video-remotion.json](/C:/TikTok_App/Backend/tools/n8n-workflows/render-template-video-remotion.json)
- [VideoOpsInternalProxyService.java](/C:/TikTok_App/Backend/src/main/java/com/tiktokapp/backend/service/videoops/VideoOpsInternalProxyService.java)
- [VideoOpsController.java](/C:/TikTok_App/Backend/src/main/java/com/tiktokapp/backend/web/VideoOpsController.java)
- [docker-compose.yml](/C:/TikTok_App/docker-compose.yml)

Bascule moteur de rendu:
- Shotstack legacy: `APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video`
- Remotion: `APP_VIDEO_OPS_N8N_RENDER_PATH=/webhook/render-template-video-remotion`
- le fichier `.env.example` documente les deux chemins
- `APP_VIDEO_OPS_N8N_READ_TIMEOUT_MS` est documente et configure a `600000` par defaut pour laisser le temps aux rendus Remotion longs

Contrainte importante avant vraie publication TikTok:
- en local, `APP_RENDER_VIDEO_PUBLIC_BASE_URL=http://localhost:8090` suffit pour tester le rendu
- pour publier reellement sur TikTok, `APP_RENDER_VIDEO_PUBLIC_BASE_URL` doit etre une URL HTTPS accessible par TikTok
- le host HTTPS doit aussi etre autorise dans `APP_VIDEO_OPS_ALLOWED_SHOTSTACK_HOSTS`, car le service d'upload backend refuse volontairement les URLs non HTTPS

## Verifications faites

- [x] `npm run build` dans `RenderVideo`
- [x] `GET /health` sur le service RenderVideo
- [x] `POST /render` sur RenderVideo avec generation effective d'un MP4 `720x1280`
- [x] validation JSON de `Backend/tools/n8n-workflows/render-template-video-remotion.json`
- [x] compilation backend via Docker/Maven: `mvn -q -DskipTests compile`
- [x] `npm run build` dans `Frontend/admin`

## Phase 4 - Templates premium

But:
- augmenter visuellement la qualite percue

Taches:
- [x] definir 2 a 3 templates premium
- [x] definir une charte typographique
- [x] definir les safe zones TikTok
- [x] definir les animations d'entree/sortie
- [x] definir les regles de sous-titres
- [x] ajouter des variations par categorie

Livrables:
- [RenderVideo/src/remotion/design/tokens.ts](/C:/TikTok_App/RenderVideo/src/remotion/design/tokens.ts) - charte typographique, safe zones officielles 720/1080, palettes catégorielles
- [RenderVideo/src/remotion/design/animations.ts](/C:/TikTok_App/RenderVideo/src/remotion/design/animations.ts) - hooks d'animation reutilisables
- [RenderVideo/src/remotion/design/AnimatedBlock.tsx](/C:/TikTok_App/RenderVideo/src/remotion/design/AnimatedBlock.tsx) - bloc anime unifie
- [RenderVideo/src/remotion/design/Captions.tsx](/C:/TikTok_App/RenderVideo/src/remotion/design/Captions.tsx) - sous-titres line / word / karaoke
- [RenderVideo/src/remotion/design/Background.tsx](/C:/TikTok_App/RenderVideo/src/remotion/design/Background.tsx) - background video + scrim partage
- [RenderVideo/src/remotion/templateRegistry.ts](/C:/TikTok_App/RenderVideo/src/remotion/templateRegistry.ts) - resolution templateId -> compositionId
- [RenderVideo/src/remotion/TikTokProVertical.tsx](/C:/TikTok_App/RenderVideo/src/remotion/TikTokProVertical.tsx) - template 1 (refactor)
- [RenderVideo/src/remotion/TikTokBoldStory.tsx](/C:/TikTok_App/RenderVideo/src/remotion/TikTokBoldStory.tsx) - template 2
- [RenderVideo/src/remotion/TikTokCleanMinimal.tsx](/C:/TikTok_App/RenderVideo/src/remotion/TikTokCleanMinimal.tsx) - template 3
- [RenderVideo/scripts/smoke-templates.mjs](/C:/TikTok_App/RenderVideo/scripts/smoke-templates.mjs) - smoke test selectComposition

Templates disponibles via `render.templateId`:
- `tiktok-pro-vertical` (defaut, alias `tiktok-pro-vertical-v1`)
- `tiktok-bold-story`
- `tiktok-clean-minimal`

Categories de palette reconnues (derivees de `idea.category` puis `idea.visualStyle`):
- `business`, `finance`, `tech`, `lifestyle`, `fitness`, `food`, `beauty`, `education`, `travel`, `entertainment`, plus une palette par defaut.

Verifications faites:
- `npm run type-check` OK
- `npm run build` OK
- `node scripts/smoke-templates.mjs`: selectComposition OK pour les 3 compositions (1080x1920 @ 30fps)

## Phase 5 - Finition FFmpeg

But:
- ameliorer le fichier final techniquement

Taches:
- [x] integrer FFmpeg au pipeline de sortie (via ffmpeg-static)
- [x] normaliser l'audio (loudnorm EBU R128: I=-14, TP=-1.5, LRA=11)
- [x] optimiser l'encodage MP4 vertical (libx264 high@4.1, yuv420p, +faststart)
- [x] ajouter compression/bitrates controles (4 profils: draft/standard/high/premium)
- [x] preparer thumbnail (JPG genere a 0.5s, accessible via `thumbnailUrl`)

Livrables:
- [RenderVideo/src/postProcess.ts](/C:/TikTok_App/RenderVideo/src/postProcess.ts) - mux voiceover + music, loudnorm, ré-encode profile, thumbnail
- [RenderVideo/scripts/smoke-postprocess.mjs](/C:/TikTok_App/RenderVideo/scripts/smoke-postprocess.mjs) - smoke test FFmpeg
- modifications [RenderVideo/src/server.ts](/C:/TikTok_App/RenderVideo/src/server.ts) pour pipeline raw -> postProcess -> final + thumbnail
- [RenderVideo/README.md](/C:/TikTok_App/RenderVideo/README.md) documente les profils

Profils de qualite:
| Profil   | Preset   | CRF | maxrate  | Audio   |
|----------|----------|-----|----------|---------|
| draft    | veryfast | 28  | 4.5 Mbps | 96 kbps |
| standard | fast     | 24  | 6.5 Mbps | 128 kbps|
| high     | medium   | 21  | 8.5 Mbps | 160 kbps|
| premium  | slow     | 19  | 10 Mbps  | 192 kbps|

Configuration:
- `FFMPEG_BIN_PATH`: surcharge optionnelle du binaire ffmpeg (sinon `ffmpeg-static`)
- `assets.music.volume`: volume de la musique en mix, defaut 0.18 (clamp [0, 1])
- la cible `loudnorm` est `I=-14` quand voiceover present, `I=-16` pour musique seule

Verifications faites:
- `npm run type-check` OK
- `npm run build` OK
- `node scripts/smoke-postprocess.mjs`: mux voice+music + loudnorm + thumbnail OK; cas no-audio OK

## Phase 6 - Amelioration du backoffice

But:
- donner un controle produit reel sur le rendu

Taches:
- [x] ajouter le choix de template dans le parcours (selecteur 3 options sur step Creation)
- [x] ajouter une preview plus fidele (thumbnail JPG affichee dans la side card du step Video)
- [x] ajouter des reglages editoriaux (selecteur qualityProfile draft/standard/high/premium)
- [x] afficher le moteur de rendu utilise (KV "Moteur" dans la side card)
- [x] afficher des statuts de rendu plus detailles (template, qualite + thumbnail)

Livrables backend:
- [V8__render_quality_profile.sql](/C:/TikTok_App/Backend/src/main/resources/db/migration/V8__render_quality_profile.sql) - colonnes `quality_profile`, `render_engine`, `thumbnail_url`
- [ContentIdea.java](/C:/TikTok_App/Backend/src/main/java/com/tiktokapp/backend/model/ContentIdea.java) - 3 nouveaux champs + getters/setters
- [ContentIdeaGateway.java](/C:/TikTok_App/Backend/src/main/java/com/tiktokapp/backend/service/videoops/ContentIdeaGateway.java) - patch + read map etendus
- [WorkflowTriggerRequest.java](/C:/TikTok_App/Backend/src/main/java/com/tiktokapp/backend/dto/videoops/WorkflowTriggerRequest.java) - champs `templateId` / `qualityProfile`
- [VideoOpsService.java](/C:/TikTok_App/Backend/src/main/java/com/tiktokapp/backend/service/videoops/VideoOpsService.java) - resolution + persistance + injection dans payload n8n
- [render-template-video-remotion.json](/C:/TikTok_App/Backend/tools/n8n-workflows/render-template-video-remotion.json) - lit templateId/qualityProfile du payload, persiste les nouvelles colonnes

Livrables frontend:
- [workflow.ts](/C:/TikTok_App/Frontend/admin/src/types/workflow.ts) - types `RenderTemplateId`, `RenderQualityProfile`, `RenderEngine` + extension `ContentIdea` / `ManualAction`
- [api.ts](/C:/TikTok_App/Frontend/admin/src/types/api.ts) - extension `WorkflowTriggerPayload`
- [TikTokJourneyPage.tsx](/C:/TikTok_App/Frontend/admin/src/pages/TikTokJourneyPage.tsx) - state `selectedTemplateId` / `selectedQualityProfile` + options
- [TikTokStepScreen.tsx](/C:/TikTok_App/Frontend/admin/src/pages/tiktok-journey/TikTokStepScreen.tsx) - 2 nouveaux selects + side card "Rendu" + thumbnail
- [useTikTokJourneySteps.ts](/C:/TikTok_App/Frontend/admin/src/pages/tiktok-journey/useTikTokJourneySteps.ts) - propage les selections au workflow
- [videoOpsSupabase.ts](/C:/TikTok_App/Frontend/admin/src/services/videoOpsSupabase.ts) - normalize les nouveaux champs

Verifications faites:
- `mvn -DskipTests compile` (backend) OK
- `npm run build` (frontend admin) OK
- JSON workflow Remotion valide

## Phase 7 - Migration complete et nettoyage

But:
- basculer en prod proprement

Taches:
- [x] outil de comparaison Shotstack vs Remotion ([Backend/tools/compare-render-engines.mjs](/C:/TikTok_App/Backend/tools/compare-render-engines.mjs))
- [x] runbook de bascule + rollback ([MIGRATION_RUNBOOK.md](/C:/TikTok_App/MIGRATION_RUNBOOK.md))
- [x] note de deprecation sur le workflow Shotstack ([Backend/tools/n8n-workflows/DEPRECATION.md](/C:/TikTok_App/Backend/tools/n8n-workflows/DEPRECATION.md))
- [ ] activation Remotion sur sous-ensemble en prod (decision humaine, depend du runbook)
- [ ] mesure stabilite et qualite sur 14 jours (humain)
- [ ] retrait Shotstack si stable (humain - voir DEPRECATION.md)
- [ ] nettoyage final des contrats et workflows legacy (humain)

Note: les actions destructives (suppression workflow Shotstack, suppression code ShotstackRenderClient) sont **volontairement non automatisees**. Auto mode n'execute pas les rollbacks irreversibles sans confirmation. Le runbook decrit la procedure manuelle.

## Phase 7 - Migration complete et nettoyage

But:
- basculer en prod proprement

Taches restantes:
- [ ] comparer rendu Shotstack vs Remotion
- [ ] activer le nouveau moteur sur un sous-ensemble
- [ ] mesurer stabilite et qualite
- [ ] retirer Shotstack si le nouveau flux est stable
- [ ] nettoyer les contrats et workflows legacy

## Ordre recommande de reprise

Si une autre session doit reprendre sans contexte:

1. lire [PHASE1_RENDER_MIGRATION.md](/C:/TikTok_App/PHASE1_RENDER_MIGRATION.md)
2. lire [render-video-job.schema.json](/C:/TikTok_App/Backend/tools/contracts/render-video-job.schema.json)
3. lire [RenderVideo/README.md](/C:/TikTok_App/RenderVideo/README.md)
4. verifier que `APP_VIDEO_OPS_N8N_RENDER_PATH` pointe vers le moteur souhaite
5. pour tester Remotion bout en bout, demarrer `render-video`, backend et n8n puis importer/publier le workflow `render-template-video-remotion.json`
6. prochaine etape: appliquer la procedure du runbook MIGRATION_RUNBOOK.md en environnement reel

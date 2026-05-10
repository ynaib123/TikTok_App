# Audit professionnel global - TikTok_App

Date: 2026-05-09  
Portee: Backend Spring Boot, Frontend React/Vite, RenderVideo Remotion, workflows n8n, Docker, contrats, securite, performance, qualite UI et qualite de rendu.

## Verdict executive

Le projet a une base serieuse: architecture multi-services claire, backend Spring Boot avec Flyway, PostgreSQL, Redis, Resilience4j, Micrometer/Prometheus, frontend React moderne avec TanStack Query, moteur de rendu Remotion separe, contrats JSON, workflows n8n versionnes dans le repo, tests unitaires et E2E existants.

Mais il n'est pas encore au niveau "production pro sans incoherence". Les principaux risques restants sont:

1. Securite backend trop permissive et endpoints internes exposes via `permitAll`.
2. Rendu non queue, non scalable horizontalement, et progression stockee en memoire process.
3. Workflows n8n contenant trop de logique JavaScript inline, avec duplication callback/error/HMAC.
4. Frontend TikTok Journey trop volumineux, avec CSS massif et logique metier concentree dans quelques fichiers.
5. Contrats encore partiellement dynamiques (`JsonNode`, `Map<String,Object>`, JSON stringifies dans n8n), donc risque de drift entre UI/backend/render.
6. Qualite de rendu correcte mais pas encore "studio": audio mixing, sous-titres, safe zones TikTok, QA automatique et diagnostics visuels incomplets.
7. Observabilite presente mais pas encore reliee de bout en bout avec traces, correlation IDs, dashboards, alerting et diagnostic utilisateur complet.

La bonne nouvelle: les fondations sont suffisamment propres pour industrialiser sans tout refaire. Il faut maintenant remplacer les zones "script/orchestration bricolable" par des contrats stricts, files de jobs, controles de qualite et composants UI plus petits.

## Stack et outils detectes

### Backend

- Java 17 cible, Spring Boot 3.5.13.
- Spring Web, Security, Validation, Data JPA, PostgreSQL, Flyway.
- Redis starter, Bucket4j, Resilience4j, Micrometer Prometheus, Actuator.
- JJWT, springdoc OpenAPI, Testcontainers, H2 tests.
- Services principaux: `VideoOpsController`, `WorkflowOrchestrator`, `MultiSceneJobBuilderService`, `VideoOpsInternalProxyService`, `AccountsService`, `TikTokOAuthService`, audio/TikTok sound services.

### Frontend admin

- React 19.2, Vite 7.3, TypeScript 5.9.
- TanStack Query 5.96, React Router 7.13.
- i18next, lucide-react, Zod, Three/R3F packages, Vitest, Playwright, ESLint.
- Parcours TikTok: creation -> audio -> medias/style -> recapitulatif -> publication.

### RenderVideo

- Node/Express, TypeScript, React 19, Remotion 4.
- AJV pour schema render job.
- ffmpeg-static/fluent-ffmpeg.
- AWS S3 SDK pour upload R2/S3.

### n8n

- Workflows versionnes:
  - `idea-script-fused.json`: 18 nodes.
  - `render-template-video-remotion.json`: 10 nodes.
  - `init-publish-tiktok.json`: 13 nodes.
  - sous-workflows `_error_handler.json`, `_callback_hmac.json`.
- n8n tourne en Docker avec acces env et builtins Node autorises.

### Docker

- Services: `postgres`, `redis`, `backend`, `render-video`, `n8n`, `frontend`, `ngrok`.
- Compose actuel est tres oriente dev: bind mounts, n8n `latest`, auth n8n desactivee, secrets via env, pas de limites CPU/memoire explicites.

## Points forts

- Decoupage fonctionnel logique: UI admin, API backend, moteur Remotion, workflows n8n.
- Persistence DB propre avec Flyway et indexes critiques deja presents.
- Auth admin modernisee: access token via cookie HttpOnly, CSRF, refresh, CORS configure.
- Backend expose deja metrics, health, Prometheus, Server-Timing sur bootstrap.
- Resilience4j est deja utilise pour les appels Groq/render.
- Contrat render `render-video-job.schema.json` versionne en 1.1.0.
- RenderVideo a deja validation AJV, rendu async, polling, bundle Remotion cache, dedup de downloads et post-process ffmpeg.
- Frontend a React Query, tests unitaires, tests Playwright, telemetry locale, et un vrai parcours utilisateur.
- Les corrections recentes ont branche les gros contrats manquants: audio selectionne dans le rendu, TikTok sound ID vers publish, auto-save style, prevention medias incomplets, creation manuelle sans race condition.

## Risques critiques

### P0. Securite API: les endpoints internes sont trop accessibles

Constat:

- `SecurityConfig.java` ignore CSRF pour `/api/video-ops/internal/**`, `/api/audio/**`, workflows, upload/publish.
- `authorizeHttpRequests` met `/api/video-ops/internal/**`, `/actuator/prometheus`, Swagger en `permitAll`.
- `anyRequest().permitAll()` garde une surface ouverte hors `/api/**`.
- Les endpoints internes verifient parfois `X-Video-Ops-Internal-Secret`, mais la securite doit etre centralisee et testee.
- n8n a `N8N_BASIC_AUTH_ACTIVE: false`, `N8N_BLOCK_ENV_ACCESS_IN_NODE: false`, builtins `crypto,http,https,url` autorises.

Impact:

- Un endpoint interne mal protege peut declencher rendu, proxy provider, acces contexte TikTok, ou callbacks.
- Prometheus ouvert expose des metriques et noms internes.
- n8n sans auth est acceptable en local seulement, dangereux si expose via ngrok ou reseau.

Taches:

1. Remplacer `anyRequest().permitAll()` par `anyRequest().denyAll()` ou par une whitelist explicite.
2. Proteger `/api/video-ops/internal/**` avec un filtre dedie obligatoire `X-Video-Ops-Internal-Secret` + comparaison constant-time.
3. Proteger `/api/video-ops/workflow-runs/*/complete` par HMAC obligatoire, timestamp et replay protection; desactiver le legacy secret en prod.
4. Restreindre `/actuator/prometheus` a admin authentifie ou reseau interne.
5. Desactiver Swagger en prod et retirer sa whitelist prod.
6. Activer auth n8n hors dev, epingler l'image n8n a une version, limiter les variables d'environnement exposees.
7. Ajouter tests Spring Security pour endpoints publics, admin, internes, callbacks, actuator.

Critere d'acceptation:

- Un appel sans auth a `/api/video-ops/internal/groq/chat-completions` retourne 401/403.
- Un callback sans HMAC valide retourne 401/403.
- Swagger/Prometheus ne sont pas publics en profil prod.
- Les tests couvrent au moins 15 routes sensibles.

## Architecture backend

### P0. Sortir le gros controller VideoOps en controllers par domaine

Constat:

- `VideoOpsController.java` fait environ 663 lignes.
- Il porte contenu, workflow, comptes, proxy interne, render, publish, batch, callbacks.
- Beaucoup de DTOs, `JsonNode`, `Map<String,Object>` et logique d'adaptation dans le controller.

Impact:

- Difficile a auditer et securiser finement.
- Risque d'introduire une regression sur une route en corrigeant une autre.
- Les tests deviennent gros et moins ciblables.

Taches:

1. Creer:
   - `ContentIdeasController`
   - `WorkflowRunsController`
   - `VideoOpsInternalController`
   - `RenderVideoProxyController`
   - `PublishController`
   - `AccountsController`
2. Deplacer les mappings sans changer les URLs publiques.
3. Ajouter des tests par controller avec `@WebMvcTest` ou tests integration.
4. Retirer les dependances inutiles de chaque controller.

Critere d'acceptation:

- Aucun controller public ne depasse 250 lignes.
- `VideoOpsController` disparait ou devient uniquement facade temporaire.
- Toutes les routes existantes repondent encore avec les memes status.

### P0. Corriger l'idempotence des workflows

Constat:

- L'idempotency key est essentiellement `workflowType:contentIdeaId`.
- Deux rendus differents sur la meme idee dans la fenetre d'idempotence peuvent reutiliser un run precedent sauf `force=true`.
- `markRunAccepted` met `completedAt` pour l'etat ACCEPTED, ce qui fausse les durees.

Impact:

- Un utilisateur peut modifier medias/style/audio puis obtenir un ancien rendu.
- Observabilite des durees et SLA incorrecte.

Taches:

1. Calculer une cle idempotente incluant un hash stable du payload significatif: template, quality, duration, scenes, styles, audio selected asset id/version, TikTok sound id.
2. Stocker `acceptedAt`, `startedAt`, `completedAt` separement.
3. Ajouter `requestHash` et `payloadVersion` sur `video_workflow_runs`.
4. Ajouter un bouton UI "forcer nouveau rendu" uniquement si hash identique ou run bloqué.

Critere d'acceptation:

- Modifier la position texte puis relancer cree un nouveau run.
- Relancer sans changement reutilise ou refuse proprement selon la politique choisie.
- Les durees Prometheus et UI sont coherentes.

### P1. Remplacer les payloads dynamiques par DTOs stricts

Constat:

- Plusieurs couches utilisent `JsonNode`, `Map<String,Object>`, JSON stringifies n8n.
- Le schema render existe, mais Java/TypeScript ne sont pas generes depuis une source unique.

Taches:

1. Definir DTO Java strict pour `RenderVideoJob`, `RenderAssets`, `RenderScene`, `TextStyle`, `AudioAsset`.
2. Generer types TypeScript depuis JSON Schema ou OpenAPI.
3. Ajouter validation Bean Validation cote Java avant appel n8n/render.
4. Ajouter test de compatibilite: Java DTO -> JSON -> AJV RenderVideo.
5. Versionner les contrats: `contractVersion` refusee si inconnue.

Critere d'acceptation:

- Plus de `Map<String,Object>` pour le render job.
- Une CI casse si le contrat backend/render diverge.

### P1. Externaliser cache/rate-limit vers Redis

Constat:

- Bucket4j rate limit est en memoire.
- Cache Pexels est local `ConcurrentHashMap`.
- Progress render est process-local cote RenderVideo.

Taches:

1. Utiliser Redis Bucket4j ProxyManager pour rate limits.
2. Mettre cache Pexels en Redis avec TTL et taille controlee.
3. Stocker render progress/status dans Redis ou DB via backend.
4. Ajouter cleanup TTL pour runs/progress temporaires.

Critere d'acceptation:

- Deux instances backend partagent les limites et cache.
- Un restart RenderVideo ne fait pas disparaitre l'etat visible du run.

## RenderVideo et qualite de rendu

### P0. Ajouter une vraie file de rendu

Constat:

- `RenderVideo/src/server.ts` lance les rendus async mais sans queue globale ni limite de concurrence durable.
- Plusieurs jobs simultanes peuvent saturer Chromium/ffmpeg/CPU/RAM.
- `progressByRunId` vit en memoire.

Taches:

1. Ajouter une queue Redis/BullMQ ou une table DB `render_jobs`.
2. Limiter la concurrence: par defaut 1 ou 2 rendus selon CPU/RAM.
3. Gerer priorites: draft < high/premium, retry manuel, annulation.
4. Persister et exposer status: queued, downloading_assets, rendering, post_processing, uploading, done, failed.
5. Ajouter endpoint cancel/retry.

Critere d'acceptation:

- 10 demandes simultanees ne font pas tomber le service; elles passent en queue.
- L'UI affiche position en queue et ETA approximatif.

### P0. Securiser les downloads d'assets

Constat:

- RenderVideo telecharge des URLs remotes donnees par payload.
- Il faut limiter SSRF, taille, content-type, timeouts, redirections.

Taches:

1. Autoriser uniquement domaines providers connus ou URLs storage interne signees.
2. Bloquer IP privees/link-local/localhost depuis les URLs.
3. Ajouter timeout connexion/lecture, taille max par asset, max redirects.
4. Verifier `Content-Type` video/audio/image attendu.
5. Scanner/normaliser extensions temporaires.

Critere d'acceptation:

- URL `http://localhost:...` ou `http://169.254.169.254` refusee.
- Asset > taille max refuse avant saturation disque.

### P1. Ameliorer mixage audio

Constat:

- Voiceover/music sont maintenant branches.
- `amix` et `-shortest` peuvent produire des effets non desires si la voix ou musique est plus courte que la video.
- Pas de rapport LUFS sauvegarde.

Taches:

1. Definir politique audio:
   - voiceover prioritaire.
   - musique loop/fade jusqu'a la duree video.
   - ducking automatique sous la voix.
   - normalisation LUFS cible TikTok.
2. Ajouter mesure LUFS pre/post et l'enregistrer dans le payload resultat.
3. Ajouter tests ffmpeg avec fichiers courts/longs/silence.
4. Ajouter UI volumes + preview avant rendu.

Critere d'acceptation:

- La video ne se coupe jamais a la duree de l'audio.
- Pas de queue silencieuse involontaire.
- Volume final stable entre rendus.

### P1. Qualite visuelle TikTok "pro"

Taches:

1. Ajouter safe zones TikTok: zone caption basse, boutons droits, top nav.
2. Ajouter overlay debug optionnel pour verifier safe zones.
3. Ajouter sous-titres automatiques synchronises ou par scene.
4. Ajouter templates variants reels: hook fort, b-roll, split text, captions mot-par-mot, CTA.
5. Ajouter validation screenshot automatique Remotion/Playwright sur 3 frames par template.
6. Ajouter test pixel non blank, texte visible, pas d'overflow, contraste minimal.
7. Prevoir fallback si clip Pexels est horizontal: crop intelligent, blur background ou reject selon quality.

Critere d'acceptation:

- Chaque rendu a thumbnail, 3 screenshots QA, score lisibilite, score safe-zone.
- Aucun texte principal n'est sous les zones UI TikTok.

## Frontend et UI

### P0. Decouper TikTok Journey

Constat:

- `TikTokJourneyPage.tsx` environ 981 lignes.
- `TemplateStep.tsx` environ 1026 lignes.
- `AudioStep.tsx` environ 598 lignes.
- `CreationStep.tsx` environ 559 lignes.
- `journey.css` environ 4844 lignes.

Impact:

- Maintenance lente.
- Risque de regressions UI.
- Difficile d'ajouter tests ciblables et Storybook.

Taches:

1. Extraire `TikTokJourneyPage` en:
   - `JourneyRouteContainer`
   - `JourneyStateProvider`
   - `JourneyStepper`
   - `JourneyExitGuard`
   - `JourneyWorkspacePersistence`
2. Extraire `TemplateStep` en:
   - `SceneStrip`
   - `PexelsSearchPanel`
   - `StyleControlsPanel`
   - `ScenePreviewCarousel`
   - `TextOverlayEditor`
3. Remplacer gros CSS par CSS modules ou fichiers par feature:
   - `journey-shell.css`
   - `journey-stepper.css`
   - `template-preview.css`
   - `audio-step.css`
   - `recap-step.css`
4. Ajouter tests composants pour autosave style, navigation stepper, recap blocking.

Critere d'acceptation:

- Aucun composant Journey ne depasse 350 lignes.
- CSS par fichier < 800 lignes.
- Tests unitaires couvrent chaque step critique.

### P0. UX de generation/render sans incoherence

Taches:

1. Ajouter un panneau "Etat du projet" visible dans le parcours:
   - idee/script OK
   - audio selected/missing
   - medias X/Y
   - style saved
   - render payload hash
   - TikTok account connected
2. Bloquer avec message clair quand une condition obligatoire manque.
3. Ajouter mode "auto-fill medias" explicite si on veut autoriser Pexels fallback.
4. Ajouter reprise apres refresh avec version de workspace, TTL et migration.
5. Ajouter reset de workspace confirme.
6. Ajouter badges "non sauvegarde", "synchronise", "pret rendu".

Critere d'acceptation:

- L'utilisateur sait toujours pourquoi un bouton est desactive.
- Un refresh navigateur ne perd pas un parcours en cours.

### P1. Performance frontend

Constat:

- React Query est deja present.
- Polling adaptatif existe.
- Mais certains ecrans restent gros et les previews video peuvent charger trop.

Taches:

1. Lazy-load des steps lourds (`TemplateStep`, `AudioStep`, `RecapStep`).
2. Virtualiser listes longues de videos/idees.
3. Limiter preloading video a la scene active + voisines.
4. Annuler fetchs Pexels/audio via AbortController.
5. Ajouter Web Vitals + mesure route transition + temps jusqu'a first actionable.
6. Mettre budgets:
   - dashboard admin < 1.5s en local dev apres cache.
   - recherche Pexels UI feedback < 200ms.
   - step switch < 100ms hors fetch.

Critere d'acceptation:

- Lighthouse ou Playwright trace disponible.
- Aucun step Journey ne freeze au scroll/drag.

### P1. Design system et coherence UI

Taches:

1. Centraliser `Button`, `Input`, `Select`, `Tabs`, `SegmentedControl`, `Stepper`, `Modal`, `Toast`, `EmptyState`, `Skeleton`, `Badge`.
2. Remplacer SVG manuels repetes par lucide-react quand possible.
3. Definir tokens: spacing, radius, colors, typography, shadows, focus ring.
4. Storybook ou Ladle pour composants critiques.
5. Audit accessibilite:
   - focus visible
   - aria labels
   - keyboard drag alternatives
   - contrastes
   - captions video preview

Critere d'acceptation:

- Un changement de theme/tokens ne demande pas d'editer 20 fichiers CSS.
- Playwright axe ou equivalent sur pages principales.

## n8n

### P0. Reduire la logique JavaScript inline critique

Constat:

- `idea-script-fused` contient beaucoup de code JS: parsing LLM, callbacks HTTP manuels, validation.
- `_callback_hmac` et `_error_handler` existent mais ne semblent pas systematiquement utilises par tous les workflows.
- Les callbacks repetent `http/https` low-level dans plusieurs nodes.

Taches:

1. Deplacer la logique metier critique vers backend services:
   - parsing/validation LLM
   - callback complete/failed
   - HMAC generation
   - normalisation render/publish payload
2. Garder n8n comme orchestrateur simple: webhook -> backend step -> provider -> backend callback.
3. Utiliser les sous-workflows `_callback_hmac` et `_error_handler` partout ou supprimer s'ils ne sont pas utilises.
4. Ajouter tests d'import/export n8n JSON en CI.
5. Ajouter versioning workflows: `workflowVersion`, changelog, migration.

Critere d'acceptation:

- Aucun node Code n'a plus de 80 lignes sauf exception documentee.
- Callback success/error est unique et partage.

### P1. Observabilite n8n

Taches:

1. Ajouter correlation id dans tous les payloads: `workflowRunId`, `contentIdeaId`, `requestHash`, `traceId`.
2. Chaque node important poste un event backend ou journalise un status.
3. Ajouter dashboard "dernieres executions n8n" dans backend/UI.
4. Alerting Slack uniquement pour erreurs actionnables, avec rate limit et grouping.

Critere d'acceptation:

- Une erreur workflow affiche dans UI: node, message, payload resume, lien execution n8n, prochaine action.

## Performance backend / vitesse de reponse

### P0. Eviter les appels longs sur threads HTTP

Constat:

- Le backend a des proxies synchrones via `HttpClient`.
- Certains chemins peuvent attendre provider/render longtemps.

Taches:

1. Tous les appels render/provider longs doivent etre async/job-based.
2. Controller retourne vite: 202 Accepted + runId.
3. Les providers passent par services avec timeout, retry, circuit breaker, fallback.
4. Ajouter bulkhead Resilience4j par provider.
5. Ajouter metriques provider: latency p50/p95/p99, error rate, retries, circuit open.

Critere d'acceptation:

- Aucun endpoint admin interactif ne bloque plus de 5s sauf upload explicite.
- Les appels render retournent 202 rapidement.

### P1. Base de donnees

Taches:

1. Auditer requetes N+1 avec logs Hibernate en profil test perf.
2. Ajouter indexes pour:
   - content ideas par status/date/category/account.
   - workflow runs par status/type/created.
   - audio assets par contentIdeaId/selected/kind.
3. Pagination obligatoire sur toutes listes.
4. Retention policy pour workflow runs, render events, failed callbacks.

Critere d'acceptation:

- Dashboard charge en temps stable avec 10k idees.
- Pas de requete non paginee sur table volumineuse.

## Docker / DevOps / Production

### P0. Separer compose dev et prod-like

Constat:

- `docker-compose.yml` melange dev convenience et services sensibles.
- n8n `latest`, auth off, env access ouvert.
- Pas de healthcheck complet pour tous les services ni resource limits.

Taches:

1. Creer:
   - `docker-compose.dev.yml`
   - `docker-compose.prod-like.yml`
2. Pinner toutes images (`n8n`, postgres, redis, node base si applicable).
3. Activer n8n auth hors dev.
4. Ajouter healthchecks backend/render/frontend/n8n.
5. Ajouter limits CPU/memory surtout RenderVideo.
6. Ajouter volumes explicites et cleanup strategy pour renders temporaires.
7. Ajouter `.env.example` complet avec commentaires.

Critere d'acceptation:

- `docker compose -f docker-compose.prod-like.yml up` ne demarre pas avec secrets manquants.
- RenderVideo ne peut pas saturer toute la machine.

### P1. CI/CD

Taches:

1. CI obligatoire:
   - backend compile + test
   - frontend type-check + lint + test + build
   - RenderVideo build + schema tests
   - n8n JSON parse/validate
   - Docker build
2. E2E Playwright sur parcours TikTok minimal avec mocks providers.
3. Artifacts: screenshots UI, rendu sample court, logs backend.
4. Dependency scanning et secret scanning.

Critere d'acceptation:

- Aucun merge sans CI verte.
- Un workflow sample prouve creation -> audio mock -> medias -> render mock -> publish init mock.

## Tests manquants prioritaires

### Backend

1. Security tests pour routes publiques/admin/internes.
2. Workflow idempotency tests avec payloads differents.
3. Render job contract tests Java -> AJV.
4. MultiScene fallback tests: medias manquants, audio selected, styles par scene.
5. Callback HMAC/replay tests.
6. TikTok publish payload avec `tiktokSoundId`.
7. Rate limit Redis/in-memory behavior tests.

### Frontend

1. Unit tests `TemplateStep`: drag text auto-save, scene switch, style persistence.
2. Unit tests `RecapStep`: blocks if medias incomplete, diagnostics render error.
3. Unit tests `AudioStep`: selected voice/music/sound, import TikTok sound.
4. Playwright Journey:
   - creation IA
   - creation manuelle
   - audio preview/generate/select
   - medias URL
   - recap blocked/incomplete
   - render started
   - publish init
5. Visual regression pages principales.

### RenderVideo

1. Schema validation tests.
2. Download security tests.
3. ffmpeg audio duration/ducking/loudness tests.
4. Remotion screenshot tests par template.
5. Queue/concurrency tests.

### n8n

1. JSON parse + nodes required.
2. Workflow payload sample tests.
3. Error path sample tests.
4. Callback HMAC integration.

## Qualite de code

### P1. Nettoyage encoding/commentaires

Constat:

- Certains fichiers affichent caracteres casses (`CrÃ©ation`, commentaires avec artefacts).
- Cela degrade confiance et lisibilite.

Taches:

1. Normaliser tous les fichiers en UTF-8.
2. Corriger libelles UI corrompus.
3. Ajouter check CI pour encoding UTF-8.

Critere d'acceptation:

- Aucun `Ã` ou sequence mojibake dans `src`.

### P1. Logging structure

Taches:

1. Logs JSON en prod avec `traceId`, `workflowRunId`, `contentIdeaId`.
2. Propager `X-Trace-Id` frontend -> backend -> n8n -> render.
3. Masquer secrets/tokens dans logs et responsePayload.
4. Ajouter `ProblemDetail` standard pour erreurs API.

Critere d'acceptation:

- Une erreur render est retrouvable par traceId dans backend, n8n et RenderVideo.

## Roadmap priorisee pour Claude Code

### Lot 1 - Securite production et endpoints internes

Objectif: fermer la surface dangereuse avant d'ajouter des features.

Taches:

1. Durcir `SecurityConfig`: whitelist stricte, `denyAll` final, Prometheus/Swagger non publics en prod.
2. Ajouter filtre interne pour `/api/video-ops/internal/**`.
3. Rendre HMAC callback obligatoire en prod.
4. Ajouter tests Spring Security.
5. Mettre a jour compose n8n dev/prod-like.

Fichiers cibles:

- `Backend/src/main/java/com/tiktokapp/backend/config/SecurityConfig.java`
- `Backend/src/main/java/com/tiktokapp/backend/service/videoops/VideoOpsInternalAuthService.java`
- `Backend/src/main/resources/application*.yml`
- `docker-compose*.yml`
- tests sous `Backend/src/test/java`

### Lot 2 - Queue de rendu et progress durable

Objectif: supprimer lenteurs, crashes et pertes de progression.

Taches:

1. Ajouter queue Redis/BullMQ ou DB.
2. Limiter concurrence RenderVideo.
3. Persister progress.
4. Ajouter cancel/retry.
5. UI: afficher queued/progress/error detail.

Fichiers cibles:

- `RenderVideo/src/server.ts`
- `RenderVideo/src/renderJob.ts`
- `Backend/src/main/java/com/tiktokapp/backend/web/VideoOpsController.java` ou nouveau controller
- `Frontend/admin/src/pages/tiktok-journey/useRenderProgress.ts`
- `Frontend/admin/src/pages/tiktok-journey/steps/RecapStep.tsx`

### Lot 3 - Contrats stricts render/workflow

Objectif: empecher les incoherences UI/backend/render.

Taches:

1. Creer DTO Java render job complet.
2. Generer types TS depuis schema.
3. Tests compat Java JSON -> AJV.
4. Hash de payload pour idempotency.
5. Versionner result payload.

Fichiers cibles:

- `Backend/tools/contracts/render-video-job.schema.json`
- `Backend/src/main/java/com/tiktokapp/backend/dto/videoops/**`
- `Backend/src/main/java/com/tiktokapp/backend/service/videoops/MultiSceneJobBuilderService.java`
- `RenderVideo/src/renderJob.ts`
- `Frontend/admin/src/types/api.ts`

### Lot 4 - Refactor TikTok Journey UI

Objectif: rendre l'UI maintenable, rapide et sans incoherence.

Taches:

1. Decouper `TikTokJourneyPage.tsx`.
2. Decouper `TemplateStep.tsx`.
3. Decouper `journey.css`.
4. Ajouter composant `ProjectReadinessPanel`.
5. Ajouter tests composants et Playwright du parcours.

Fichiers cibles:

- `Frontend/admin/src/pages/TikTokJourneyPage.tsx`
- `Frontend/admin/src/pages/tiktok-journey/steps/TemplateStep.tsx`
- `Frontend/admin/src/pages/tiktok-journey/steps/AudioStep.tsx`
- `Frontend/admin/src/pages/tiktok-journey/steps/RecapStep.tsx`
- `Frontend/admin/src/styles/features/journey.css`

### Lot 5 - n8n industrialisation

Objectif: workflows simples, auditables, recuperables.

Taches:

1. Utiliser `_callback_hmac` et `_error_handler` partout ou les supprimer.
2. Deplacer parsing/normalisation critique vers backend.
3. Reduire nodes Code > 80 lignes.
4. Ajouter validation JSON n8n en CI.
5. Ajouter dashboard execution/errors.

Fichiers cibles:

- `Backend/tools/n8n-workflows/*.json`
- `n8n-local/shared/*.json`
- `Backend/src/main/java/com/tiktokapp/backend/service/videoops/**`

### Lot 6 - Qualite rendu studio

Objectif: passer d'un rendu fonctionnel a un rendu fiable et commercialisable.

Taches:

1. Safe zones TikTok.
2. Sous-titres par scene / mot.
3. Ducking musique + LUFS.
4. Screenshots QA automatiques.
5. Templates variantes.
6. Visual regression tests.

Fichiers cibles:

- `RenderVideo/src/remotion/**`
- `RenderVideo/src/postProcess.ts`
- `RenderVideo/src/server.ts`
- `Backend/tools/contracts/render-video-job.schema.json`

### Lot 7 - Observabilite, perf et CI

Objectif: savoir vite ce qui casse et pourquoi.

Taches:

1. Correlation ID end-to-end.
2. Logs structures.
3. Dashboards metrics.
4. CI complete.
5. Load tests backend/render.
6. Retention DB.

Fichiers cibles:

- `.github/workflows/**`
- `Backend/src/main/java/com/tiktokapp/backend/config/**`
- `Backend/src/main/resources/logback-spring.xml`
- `Frontend/admin/src/services/adminPerformance.ts`
- `RenderVideo/src/server.ts`

## Ordre recommande

1. Lot 1 Securite.
2. Lot 2 Queue/progress rendu.
3. Lot 3 Contrats stricts/idempotence.
4. Lot 4 Refactor UI Journey.
5. Lot 5 n8n.
6. Lot 6 Qualite rendu.
7. Lot 7 Observabilite/CI/perf continue.

Ne pas commencer par refaire l'UI visuelle avant les contrats et la queue: sinon l'interface paraitra plus pro, mais les incoherences et lenteurs resteront.

## Definition du niveau professionnel attendu

Le projet peut etre considere "niveau pro" quand:

- Aucune route interne critique n'est publique.
- Un rendu ne peut pas faire tomber le service sous charge.
- Tout rendu est reproductible par un payload versionne et hashable.
- L'utilisateur sait toujours ce qui manque avant generation/publication.
- Une erreur affiche une cause actionnable et un diagnostic.
- Les workflows n8n sont versionnes, testables et peu charges en code inline.
- Les tests couvrent le parcours complet creation -> audio -> medias -> rendu -> publication.
- Les rendus passent une QA automatique: audio, safe zones, lisibilite, non-blank, duree.
- Docker a une configuration dev et une configuration prod-like distinctes.
- CI bloque regressions types, lint, tests, schema, workflows et builds Docker.


# Progress — Auto-execution overnight

Branche : `wip/auto-phases`
Pas de push.

## Légende
- ✅ done
- 🟡 partial
- ⏸ pending-user (intervention requise)
- ❌ skipped (hors scope nuit)
- 🔄 in-progress

---

## Phase 1 — Stabilité

| ID | Livrable | Statut | Notes |
|----|----------|--------|-------|
| 1.1 | Indexes DB | ✅ | V3__add_critical_indexes.sql |
| 1.2 | Micrometer + Prometheus | ✅ | actuator + VideoOpsMetrics + application.yml |
| 1.3 | Trace ID MDC | ✅ | TraceIdInterceptor + WebMvcConfig + logback-spring.xml |
| 1.4 | Resilience4j | ✅ | @CircuitBreaker/@Retry sur N8nWorkflowGateway + ServiceQuotaProbe |
| 1.5 | OpenAPI / Swagger | ✅ | OpenApiConfig + springdoc dep + sécurité paths permitAll |
| 1.6 | Refresh tokens persistés | ✅ | V4 migration + AdminRefreshTokenEntity/Repository + JPA-backed store + cleanup @Scheduled |
| 1.7 | Tests Testcontainers | 🟡 | IntegrationTestBase + AuditServiceIntegrationTest + CriticalControllerPathsIntegrationTest (login fail/refresh/logout, accounts upsert/disconnect, callback rejection). 41 tests verts |
| 1.8 | Audit log | ✅ | V5 + AuditEvent/Repository/Service + hooks: login (succès/échec), refresh, logout, service_connection saved/deleted, tiktok_account disconnected, content_idea deleted |
| 1.9 | TS strict + a11y + Prettier + Husky | 🟡 | Prettier + Husky + lint-staged + eslint-plugin-jsx-a11y + eslint-config-prettier wired. Migration .js→.ts NON faite (60+ fichiers, hors scope nuit) |
| 1.10 | CI GitHub Actions | ✅ | Trivy scan ajouté au workflow existant + dependabot.yml. Branch protection à activer manuellement côté GitHub |

## Phase 2 — Architecture

| ID | Livrable | Statut | Notes |
|----|----------|--------|-------|
| 2.1 | Splitter VideoOpsService | ❌ | Skipped (haut risque overnight, ~8h, recommandé en daylight) |
| 2.2 | Splitter Controller | ❌ | Skipped (idem) |
| 2.3 | Sub-workflows n8n | ❌ | Hors scope nuit (effort 10h, JSON manuel) |
| 2.4 | Idempotency-key bout-en-bout | ✅ | Déjà plumbé via VideoWorkflowRun.idempotencyKey + n8n payload |
| 2.5 | Dead-letter queue | ✅ | V6 + FailedCallback + Queue + RetryWorker. Replay réel via CallbackReplayService (réinvoque completeWorkflowRun). Enqueue branché dans VideoOpsController sur exception transitoire |
| 2.6 | Décomposer pages | 🟡 | VideoOpsController split en 3 (VideoOps + Observability + TikTokOAuth). Pages frontend non décomposées (TikTokJourneyPage 582L à voir) |
| 2.7 | Design system primitives | ✅ | Button + Modal + Pill + Spinner + index. Adoptés dans VideoDashboardPage et AccountsHeader |
| 2.8 | i18next | ❌ | Hors scope nuit |
| 2.9 | react-query partout | ❌ | Skipped (refacto large) |
| 2.10 | Polling intelligent | ✅ | useAdaptivePolling.ts + pollIntervalForCollection. Wiré dans useTikTokWorkflow.contentIdeasQuery + useVideoDashboard.observability/dashboard |
| 2.11 | Docker compose dev | ✅ | docker-compose.dev.yml (postgres + n8n + backend + admin) |
| 2.12 | Profiles Spring | ✅ | application-dev/staging/prod.yml |

## Phase 3 — AI agents

| ID | Livrable | Statut | Notes |
|----|----------|--------|-------|
| 3.1 | Infrastructure AI agents | 🟡 | V7 + scaffolding complet. Stub honnête : `app.ai.agents.enabled=false` par défaut → endpoint POST /run renvoie 501 explicite. runAgentLoop throw 501 (avant retournait un faux 200). À brancher : Anthropic SDK + ANTHROPIC_API_KEY |
| 3.2-3.13 | Agents + features | ❌ | Hors scope nuit |

---

## Log d'exécution

### Phase 1 — terminé
- Tous les livrables 1.x livrés en code (✅ ou 🟡 selon scope nuit)
- Frontend `tsc --noEmit` : 0 erreur
- Backend : pas de Maven local pour build → vérification au réveil avec `mvn verify`

### Phase 2 — partiel (additifs livrés, refactos skippés)
- 2.4, 2.5, 2.7 (primitives), 2.10, 2.11, 2.12 livrés
- 2.1, 2.2, 2.6, 2.8, 2.9 explicitement skippés (haut risque overnight sans validation visuelle)

### Phase 3 — squelette infrastructure
- 3.1 livré en mode skeleton : tout le scaffolding pour brancher des agents + 1 stub "ping". Le tool-use loop Claude API n'est pas implémenté (besoin de ta clé API).

## Vérifications faites en autopilot

✅ **Backend `mvn compile`** : BUILD SUCCESS, 146 fichiers compilent.
✅ **Backend `mvn test`** (sans Testcontainers) : 13 tests passent, 0 erreur.
✅ **Frontend `npm install`** : 158 nouvelles deps installées, 0 vulnerability.
✅ **Frontend `tsc --noEmit`** : 0 erreur.
✅ **Frontend `eslint src --quiet`** : 0 erreur (40 warnings a11y sur code legacy, à corriger en daylight pendant Phase 2.6).
✅ **Frontend `npm run build`** : built in 7.71s, 158 modules transformés.
✅ **Husky v9 syntax** : pre-commit hook migré vers la syntaxe moderne (sans `_/husky.sh`).

## Actions qui restent côté toi (bloquantes — credentials/decisions)

1. **Lancer backend en profil dev avec Postgres réel** → confirme que V3-V7 Flyway migrations s'appliquent (j'ai pas Postgres ici)
2. **Tester `GET /swagger-ui.html`** quand tu lances le backend (login admin requis)
3. **Tester `GET /actuator/prometheus`** (public, pas de login)
4. **Activer la branch protection** sur GitHub (PR required + CI checks pass) — j'ai pas accès gh
5. **Tests Testcontainers** : lance `mvn test` quand Docker tourne sur ta machine (j'ai pas Docker dispo ici, AuditServiceIntegrationTest a été écrit mais pas exécuté)
6. **Pour 3.1 finaliser** : ajouter dep Anthropic SDK + `ANTHROPIC_API_KEY` env + remplacer le stub `runAgentLoop`

## Limites connues

- Pas de PR ni push : tout reste sur la branche `wip/auto-phases` localement.
- Pas de visual testing — toutes les vérifs sont compile/lint/type-check.
- AgentOrchestrator.runAgentLoop : maintenant throw 501 (au lieu d'un faux 200). Endpoint gated par `app.ai.agents.enabled=false`. Brancher Anthropic SDK pour activer.

## Session 2026-05-05 — solidification

- ✅ Adaptive polling effectivement wiré (Phase 2.10 réelle)
- ✅ Design system adopté (Phase 2.7 réelle)
- ✅ Audit hooks complets (Phase 1.8 réelle)
- ✅ DLQ replay réel (Phase 2.5 fini)
- ✅ Split VideoOpsController (extrait observability + OAuth)
- ✅ Tests contrôleurs critiques : 41 tests verts (vs 13 avant)
- ✅ ApiExceptionHandler renforcé : OptimisticLocking → 409, IllegalArgument → 400 (avant : 500 silencieux)
- ✅ AgentOrchestrator stub honnête : 501 explicite + feature flag
- Backend `mvn test` : BUILD SUCCESS
- Frontend `tsc --noEmit` : 0 erreur

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
| 1.7 | Tests Testcontainers | 🟡 | IntegrationTestBase + AuditServiceIntegrationTest. Reste à étendre aux autres services |
| 1.8 | Audit log | 🟡 | V5 migration + AuditEvent + AuditEventRepository + AuditService + hook delete idea. Reste à hook login/logout/save service |
| 1.9 | TS strict + a11y + Prettier + Husky | 🟡 | Prettier + Husky + lint-staged + eslint-plugin-jsx-a11y + eslint-config-prettier wired. Migration .js→.ts NON faite (60+ fichiers, hors scope nuit) |
| 1.10 | CI GitHub Actions | ✅ | Trivy scan ajouté au workflow existant + dependabot.yml. Branch protection à activer manuellement côté GitHub |

## Phase 2 — Architecture

| ID | Livrable | Statut | Notes |
|----|----------|--------|-------|
| 2.1 | Splitter VideoOpsService | ❌ | Skipped (haut risque overnight, ~8h, recommandé en daylight) |
| 2.2 | Splitter Controller | ❌ | Skipped (idem) |
| 2.3 | Sub-workflows n8n | ❌ | Hors scope nuit (effort 10h, JSON manuel) |
| 2.4 | Idempotency-key bout-en-bout | ✅ | Déjà plumbé via VideoWorkflowRun.idempotencyKey + n8n payload |
| 2.5 | Dead-letter queue | ✅ | V6 migration + FailedCallback entity + FailedCallbackQueue + RetryWorker @Scheduled. Wiring du replay actuel = stub (next-step) |
| 2.6 | Décomposer pages | ❌ | Skipped (16h, recommandé en daylight avec UI testing) |
| 2.7 | Design system primitives | 🟡 | Button + Modal + Pill + Spinner + index. Storybook skipped |
| 2.8 | i18next | ❌ | Hors scope nuit |
| 2.9 | react-query partout | ❌ | Skipped (refacto large) |
| 2.10 | Polling intelligent | ✅ | useAdaptivePolling.ts (helper pollIntervalForStage). Wiring dans les useQuery existants à faire au réveil |
| 2.11 | Docker compose dev | ✅ | docker-compose.dev.yml (postgres + n8n + backend + admin) |
| 2.12 | Profiles Spring | ✅ | application-dev/staging/prod.yml |

## Phase 3 — AI agents

| ID | Livrable | Statut | Notes |
|----|----------|--------|-------|
| 3.1 | Infrastructure AI agents | 🟡 | V7 migration + AgentRun entity + AgentRegistry + AgentToolRegistry + AgentOrchestrator (skeleton, runAgentLoop returns stub) + AgentController + AgentDefinition + AgentTool interface + BootstrapAgents (ping stub). LLM tool-use loop NON implémenté (nécessite ANTHROPIC_API_KEY user-managed) |
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

## Actions à faire au réveil

1. `cd Backend && mvn clean verify` → vérifier que tout compile + les nouveaux tests passent
2. Lancer backend en profil dev → vérifier que les V3-V7 migrations s'appliquent sans erreur
3. Vérifier `GET /swagger-ui.html` → doc API rendue
4. Vérifier `GET /actuator/prometheus` → métriques exposées
5. `cd Frontend/admin && npm install` (nouvelles deps : prettier, husky, lint-staged, eslint-plugin-jsx-a11y, eslint-config-prettier)
6. Optionnel : `npm run prepare` pour activer husky
7. Activer la branch protection sur GitHub (PR required + CI checks)
8. Pour 3.1 finaliser : ajouter la dep Anthropic SDK (`org.anthropic:anthropic-java`) ou un client HTTP custom, fournir `ANTHROPIC_API_KEY` env, et remplacer `runAgentLoop` stub par le vrai tool-use loop

## Limites connues

- `FailedCallbackRetryWorker.retryDue()` enregistre les retry mais ne replay pas encore le handler original — c'est un MVP visibility-only. À étendre quand 2.1 (split VideoOpsService) sera fait pour avoir un point d'entrée propre.
- Pas de PR ni push : tout reste sur la branche `wip/auto-phases` localement.
- Pas de visual testing — toutes les vérifs sont compile/lint/type-check.

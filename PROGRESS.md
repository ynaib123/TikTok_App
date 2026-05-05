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
| 2.1 | Splitter VideoOpsService | ⏳ | |
| 2.2 | Splitter Controller | ⏳ | |
| 2.3 | Sub-workflows n8n | ❌ | Hors scope nuit (effort 10h, JSON manuel) |
| 2.4 | Idempotency-key bout-en-bout | ⏳ | |
| 2.5 | Dead-letter queue | ⏳ | |
| 2.6 | Décomposer pages (priorité TikTokAccountsPage) | 🟡 | Partiel |
| 2.7 | Design system + Storybook | 🟡 | Tokens + primitives, pas Storybook |
| 2.8 | i18next | ❌ | Hors scope nuit (8h refacto strings) |
| 2.9 | react-query partout | 🟡 | Patterns créés, migration partielle |
| 2.10 | Polling intelligent | ⏳ | |
| 2.11 | Docker compose dev | ⏳ | |
| 2.12 | Profiles Spring | ⏳ | |

## Phase 3 — AI agents

| ID | Livrable | Statut | Notes |
|----|----------|--------|-------|
| 3.1 | Infrastructure AI agents | ⏳ | Squelette uniquement |
| 3.2-3.13 | Agents + features | ❌ | Hors scope nuit |

---

## Log d'exécution

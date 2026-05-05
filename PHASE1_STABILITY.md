# Phase 1 — Stabilité & Qualité (Foundations)

**Durée estimée** : ~2 mois
**Objectif** : Mettre en place les garde-fous production-grade. Pas de nouvelle feature, uniquement de la robustesse.

---

## Livrable 1.1 — Indexes DB manquants (Backend)

**Problème** : queries critiques sans index → scans séquentiels.
**Effort** : 1h.

### À faire
Créer `Backend/src/main/resources/db/migration/V3__add_critical_indexes.sql` :
```sql
CREATE INDEX IF NOT EXISTS idx_content_ideas_id_desc ON content_ideas (id DESC);
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_open_id ON tiktok_accounts (open_id);
CREATE INDEX IF NOT EXISTS idx_video_pipeline_states_content_idea_id ON video_pipeline_states (content_idea_id);
CREATE INDEX IF NOT EXISTS idx_video_pipeline_events_content_idea_id_created ON video_pipeline_events (content_idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_workflow_runs_content_idea_id_started ON video_workflow_runs (content_idea_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_workflow_runs_idempotency_key ON video_workflow_runs (idempotency_key) WHERE idempotency_key IS NOT NULL;
```

### Acceptance
- `EXPLAIN ANALYZE` sur les queries fréquentes utilise les indexes
- Migration appliquée sans downtime

---

## Livrable 1.2 — Observabilité Micrometer + Prometheus (Backend)

**Effort** : 4h.

### À faire
1. Ajouter dans `pom.xml` :
   - `spring-boot-starter-actuator`
   - `micrometer-registry-prometheus`
2. Configurer `application.yml` :
   ```yaml
   management:
     endpoints:
       web:
         exposure:
           include: health,info,metrics,prometheus
     metrics:
       tags:
         application: tiktok-backend
   ```
3. Annoter les services critiques avec `@Timed` et `@Counted` :
   - `VideoOpsService.triggerMainPipeline` → `pipeline.trigger`
   - `WorkflowCallbackService.completeRun` → `callback.complete`
   - `TikTokOAuthService.refresh` → `tiktok.oauth.refresh`
   - `ServiceQuotaProbe.probe` → `quota.probe`
4. Custom metrics dans `VideoOpsMetrics.java` :
   - `Counter` : `n8n_callback_failures_total{workflow}`
   - `Timer` : `workflow_run_duration{workflow_type}`
   - `Gauge` : `tiktok_accounts_active`

### Acceptance
- `GET /actuator/prometheus` retourne les métriques au format Prometheus
- Dashboard Grafana avec 3 panneaux : pipeline throughput, callback failures, OAuth latency

---

## Livrable 1.3 — Trace ID MDC (Backend)

**Effort** : 2h.

### À faire
1. Créer `web/TraceIdInterceptor.java` (HandlerInterceptor) qui :
   - Lit `X-Request-Id` header sinon génère un UUID
   - `MDC.put("traceId", id)` au début, `MDC.remove` à la fin
   - Renvoie le header dans la response
2. Configurer le pattern Logback :
   ```xml
   <pattern>%d{ISO8601} [%thread] [%X{traceId}] %-5level %logger{36} - %msg%n</pattern>
   ```
3. Propager le `traceId` au déclenchement n8n (`N8nWorkflowGateway.trigger` → header `X-Trace-Id`)
4. Stocker dans `VideoWorkflowRun.traceId` colonne (migration V4)

### Acceptance
- Tous les logs contiennent `[traceId=xxx]`
- Une requête → tous ses logs partagent le même traceId
- n8n reçoit et logue le traceId

---

## Livrable 1.4 — Resilience4j (Backend)

**Effort** : 6h.

### À faire
1. Ajouter `pom.xml` : `resilience4j-spring-boot3`, `resilience4j-circuitbreaker`, `resilience4j-retry`
2. Configurer dans `application.yml` :
   ```yaml
   resilience4j:
     circuitbreaker:
       instances:
         n8n: { failureRateThreshold: 50, slidingWindowSize: 10, waitDurationInOpenState: 30s }
         tiktok: { failureRateThreshold: 50, slidingWindowSize: 10, waitDurationInOpenState: 60s }
         shotstack: { ... }
         pexels: { ... }
         groq: { ... }
     retry:
       instances:
         n8n: { maxAttempts: 3, waitDuration: 1s, exponentialBackoffMultiplier: 2 }
   ```
3. Annoter les méthodes :
   - `N8nWorkflowGateway.trigger` → `@CircuitBreaker(name="n8n") @Retry(name="n8n")`
   - `TikTokOAuthService.refresh` → `@CircuitBreaker(name="tiktok")`
   - `ServiceQuotaProbe.probePexels/probeShotstack` → `@CircuitBreaker(name=...)`
4. Fallback methods qui retournent un `ResponseStatusException` 503 explicite

### Acceptance
- Quand n8n est down 5x de suite, le circuit s'ouvre 30s
- Métriques resilience4j exposées via `/actuator/prometheus`

---

## Livrable 1.5 — OpenAPI / Swagger (Backend)

**Effort** : 2h.

### À faire
1. Ajouter `springdoc-openapi-starter-webmvc-ui` dans `pom.xml`
2. Annoter les controllers : `@Tag`, `@Operation`, `@ApiResponse`
3. UI accessible à `/swagger-ui.html`
4. Exporter `openapi.yaml` en CI pour génération de client TS côté frontend

### Acceptance
- Page `/swagger-ui.html` opérationnelle
- Tous les endpoints documentés avec exemples de payload

---

## Livrable 1.6 — Refresh tokens persistés (Backend)

**Effort** : 3h.

### À faire
1. Migration V5 : table `admin_refresh_tokens (token_hash, admin_id, expires_at, created_at, revoked_at)`
2. Remplacer `InMemoryRefreshTokenStore` par `JpaRefreshTokenStore`
3. Index unique sur `token_hash`
4. Job nettoyage : `@Scheduled` qui supprime les tokens expirés depuis 7j

### Acceptance
- Sessions admin survivent au redémarrage du backend
- `revoke` fonctionne (logout côté serveur)

---

## Livrable 1.7 — Tests Testcontainers (Backend)

**Effort** : 8h.

### À faire
1. Ajouter `testcontainers`, `testcontainers-postgresql`, `wiremock-jre8-standalone` dans `pom.xml`
2. Créer `IntegrationTestBase.java` :
   - `@Testcontainers @Container PostgreSQLContainer postgres`
   - `@DynamicPropertySource` pour pointer datasource
3. Réécrire les tests d'intégration sur Postgres réel :
   - `VideoOpsServiceIntegrationTest`
   - `WorkflowCallbackIntegrationTest`
   - `AccountsServiceIntegrationTest`
4. WireMock pour TikTok / Groq / Shotstack / Pexels / n8n
5. Tests resilience : circuit breaker s'ouvre, retry fonctionne, dead-letter etc.

### Acceptance
- ≥ 70% coverage backend
- Tests passent en CI (durée < 5min)

---

## Livrable 1.8 — Audit log (Backend)

**Effort** : 4h.

### À faire
1. Migration V6 : table `audit_events (id, admin_id, action, resource_type, resource_id, payload_json, ip, user_agent, created_at)`
2. `AuditService.log(action, resource, payload)` (async via `@Async`)
3. Hooks dans : login, logout, save service connection, delete content idea, trigger workflow, disconnect TikTok
4. Endpoint `GET /api/admins/audit-log` (pagination, filtres)

### Acceptance
- Toute action sensible apparaît dans `audit_events`
- Insert seulement (revoke UPDATE/DELETE via grant Postgres)

---

## Livrable 1.9 — TS strict + ESLint a11y + Prettier + Husky (Frontend)

**Effort** : 6h.

### À faire
1. `tsconfig.json` :
   ```json
   "strict": true,
   "noImplicitAny": true,
   "strictNullChecks": true,
   "exactOptionalPropertyTypes": true,
   "noUncheckedIndexedAccess": true
   ```
2. Renommer tous les `.js` → `.ts` / `.tsx` sous `src/` (sauf vite.config etc.)
3. Fix les erreurs TS au fur et à mesure
4. Ajouter `eslint-plugin-jsx-a11y` + `prettier` + `eslint-config-prettier`
5. Husky + lint-staged :
   ```json
   "lint-staged": {
     "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
   }
   ```
6. Pre-commit : lint + format + tsc --noEmit

### Acceptance
- `npm run typecheck` passe à 0 erreur
- `npm run lint` à 0 erreur a11y
- Pre-commit bloque les fichiers mal formatés

---

## Livrable 1.10 — CI GitHub Actions

**Effort** : 4h.

### À faire
Créer `.github/workflows/ci.yml` :
- Job `backend-test` : Maven build + test + Testcontainers (services postgres)
- Job `frontend-test` : npm install + tsc + eslint + vitest + build
- Job `security` : Trivy scan + OWASP dep check
- Branch protection : require all checks pass before merge

Ajouter `.github/workflows/dependabot.yml` (configs MAJ deps).

### Acceptance
- PR bloquée si CI rouge
- Notifications Slack/email sur failures

---

## Ordre d'exécution recommandé

1. **1.1 Indexes** (gain immédiat sur queries existantes)
2. **1.5 OpenAPI** (utile pour 1.7 et 1.9)
3. **1.3 Trace ID** (rend le debug 1.4 et 1.7 plus simple)
4. **1.2 Micrometer** (visualise les effets de 1.4)
5. **1.4 Resilience4j**
6. **1.6 Refresh tokens persistés**
7. **1.8 Audit log**
8. **1.9 TS strict frontend**
9. **1.7 Tests Testcontainers**
10. **1.10 CI GitHub Actions** (en dernier, bloque tout le monde sinon)

---

## Total Phase 1 : ~40h ingé senior, étalable sur 6-8 semaines part-time

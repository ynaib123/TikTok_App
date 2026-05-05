# Analyse globale TikTok_App — Roadmap niveau pro

**Date** : 2026-05-05
**Niveau actuel** : Junior solide → Mid
**Cible** : Production-grade industriel

---

## Diagnostic général

Tu as les bases (Spring Boot 3, React 18 + TS, Vite, react-query, Flyway, AES-GCM, HMAC callbacks, n8n orchestration). Ce qui manque, ce sont les **garde-fous industriels** : observabilité, resilience, tests, typage strict, design system, i18n, et automatisations.

---

## 1. Backend — Spring Boot

### Faiblesses identifiées
- `VideoOpsService` obèse (15 deps injectées) — mélange query/publish/tracking/pipeline.
- `VideoOpsController` à 50+ endpoints (orchestration, proxy, OAuth, accounts, batch).
- N+1 et indexes manquants : `content_ideas.id`, `tiktok_accounts.openId`, `video_pipeline_states.contentIdeaId`. `fetchContentIdeas` charge sans pagination.
- Pas de circuit breaker / retry — un timeout n8n / Groq / Shotstack tue la requête.
- Pas de rate limiting sur `/api/**`.
- Observabilité minimale — pas de Micrometer / Prometheus, pas de MDC traceId, pas de structured JSON logs.
- Refresh tokens en mémoire (`InMemoryRefreshTokenStore`) → perdus au redémarrage.
- Pas d'OpenAPI/Swagger, pas de versioning d'API.
- Tests : 6 fichiers pour ~50 endpoints. H2 in-memory + mocks au lieu de Testcontainers.

### Améliorations prioritaires
1. Splitter `VideoOpsService` par domaine
2. Migration V3 avec indexes manquants
3. Micrometer + Prometheus + `/actuator/health,/actuator/metrics`
4. MDC traceId via interceptor HTTP (propagé jusqu'à n8n)
5. Resilience4j (circuit breaker + retry exponentiel) sur n8n / TikTok / Groq / Shotstack / Pexels
6. Bucket4j rate limiting
7. springdoc-openapi + UI Swagger
8. Persister les refresh tokens en DB
9. Tests Testcontainers (Postgres réel + WireMock)
10. Audit log structuré (table `audit_events`)

---

## 2. Frontend — React/TS

### Faiblesses identifiées
- Pages monolithiques (`TikTokAccountsPage` ~59 useState).
- 60+ fichiers `.js` non typés, ESLint en mode `recommended` seulement.
- Re-renders inutiles, pas de virtualization pour grandes listes.
- A11y quasi-absente — pas de `eslint-plugin-jsx-a11y`, focus management custom.
- i18n totalement absent — strings français hardcodés.
- Pas de design system centralisé, beaucoup d'`style={{...}}` inline.
- Pas de Prettier / Husky / lint-staged.
- Tests fragmentés : `node --test` + Vitest cohabitent.
- Pas de Storybook.

### Améliorations prioritaires
1. Migrer 100 % en TS strict (`noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`)
2. Décomposer pages géantes en composants atomiques
3. `eslint-plugin-jsx-a11y` + `axe-core` en dev
4. i18next + namespace `fr`
5. Design system centralisé + Storybook
6. Prettier + Husky + lint-staged
7. react-query partout (queryKeys namespacés)
8. Optimistic updates sur mutations
9. Suspense + lazy sur toutes les pages
10. Bundle analyzer
11. Polling intelligent (refetchInterval adaptatif selon pipelineStage)

---

## 3. n8n workflows

### Faiblesses identifiées
- Duplication massive (~200 lignes répétées entre 4 workflows : callback retry, HMAC, error handler).
- Pas de sub-workflows partagés.
- Idempotency-key non envoyé par n8n (le backend a le champ mais ne le reçoit pas).
- Modèles Groq, hosts Pexels, seuils qualité hardcodés dans le JSON.
- Pas de versioning de payload entre backend et n8n.
- Pas de dead-letter — un callback qui échoue 3x est perdu.
- Pas de tests des workflows.

### Améliorations prioritaires
1. Extraire 3 sub-workflows : `_callback-with-hmac`, `_error-callback`, `_retry-with-backoff`
2. Schéma de payload versionné (header `X-Workflow-Contract-Version: 1`)
3. Idempotency-key (UUID par run, validé backend)
4. Externaliser config (modèles Groq, scoring Pexels, timeouts) via endpoint interne
5. Dead-letter queue (table `failed_callbacks` + retry worker + alerting Slack)
6. Tests d'intégration WireMock sur scénarios `n8n → backend`
7. Pousser execution ID n8n dans chaque callback pour corrélation backend

---

## 4. Performance & DX

- Caching Redis (sessions admin, quota probes, dashboard summary, accounts overview)
- CDN frontend (Cloudflare/Vercel) + compression brotli
- HTTP/2 + tuning HikariCP explicite
- Background jobs (`@Scheduled` ou Quartz) : polling Shotstack stuck, refresh tokens TikTok proches expiration, cleanup events anciens
- Partitionnement DB par mois sur `video_pipeline_events` (à terme)

---

## 5. Sécurité

- Rate limiting par IP + user (Bucket4j)
- CSP + security headers
- Rotation des secrets — encryption key versionnée (`enc:v2:` préfixe)
- 2FA admin (TOTP)
- Audit log immutable (append-only)
- Secret scanning CI (`gitleaks`)

---

## 6. DevOps & qualité

- CI GitHub Actions (lint + test + build + Trivy + Dependabot + OWASP dep check)
- Docker compose dev local : Postgres + n8n + backend + admin
- Profiles Spring `dev` / `staging` / `prod` distincts + secrets via Vault/Doppler
- Pre-commit hooks (Husky front, `pre-commit` back)
- Renovate Bot
- SonarCloud

---

## 7. Intégration AI agents — où ça apporte vraiment

### A. Agent "Content Strategist"
Analyse les performances passées (vues, likes, completion rate) et propose des sujets/formats à fort potentiel. Tools : `getVideoMetrics`, `searchTrendingTopics`, `proposeIdeas`.

### B. Agent "Script Quality Reviewer"
Avant de lancer le rendu Shotstack (étape coûteuse), un agent relit le script et le note (hook, longueur, CTA, conformité TikTok). Évite de cramer du quota Shotstack sur des scripts faibles.

### C. Agent "Pipeline Doctor"
Surveille les `failed_workflow_runs` et propose diagnostic + fix. Tools : `getRunLogs`, `getPipelineEvents`, `retryWorkflow`, `notifyOps`.

### D. Agent "Caption Optimizer"
Génère 3 variantes de caption optimisées SEO TikTok à partir du script. Claude Haiku (rapide, peu cher).

### E. Agent "Accounts Health Monitor"
Explique en langage humain l'état des services (quota Pexels à 5%, token TikTok expire dans 3j, Shotstack queue saturée). Propose des actions.

### F. Agent "Onboarding & Help"
Chat assistant intégré au admin avec RAG sur la doc + schéma API.

### Architecture technique
- Module backend `ai-agents/` (AgentController + AgentOrchestrator + Tools Spring beans)
- Claude Agent SDK
- Table `agent_runs` (audit, coût, tokens)
- Sécurité : scope par agent (read-only par défaut, write whitelisté)
- Observabilité : logger tokens in/out, latence, coût → dashboard ROI

---

## 8. Autres fonctionnalités à fort impact

- Calendar / Scheduler de publications futures
- A/B testing (variantes caption/thumbnail)
- Multi-comptes TikTok (rotation, load-balancing)
- Webhook entrant TikTok (commentaires, vues seuils)
- Templates Shotstack (bibliothèque + preview + params)
- Analytics dashboard temps réel
- Export comptable (CSV/PDF coûts API)
- API publique (API key auth)
- Mobile app (React Native)

---

## Roadmap 3 phases × ~2 mois

| Phase | Thème | Livrable principal |
|-------|-------|-------------------|
| 1 | Stabilité & qualité | Foundations production-grade |
| 2 | Architecture & UX | Industrialisation et propreté |
| 3 | Différenciation produit | AI agents + features avancées |

Détails dans `PHASE1_STABILITY.md`, `PHASE2_ARCHITECTURE.md`, `PHASE3_AI_FEATURES.md`.

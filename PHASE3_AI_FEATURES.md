# Phase 3 — Différenciation produit (AI agents + features avancées)

**Durée estimée** : ~2 mois
**Prérequis** : Phases 1 & 2 complétées (foundation stable + architecture propre)
**Objectif** : Transformer un outil interne en produit différenciant avec de la valeur métier réelle.

---

## Livrable 3.1 — Infrastructure AI agents (Backend)

**Effort** : 12h.

### À faire
1. Module `Backend/src/main/java/com/tiktokapp/backend/ai/` :
   - `AgentController.java` — endpoints `/api/ai/agents/{agentId}/run` et `/api/ai/agents/{agentId}/runs`
   - `AgentOrchestrator.java` — appelle Claude API avec tool-use loop
   - `AgentRegistry.java` — Map<agentId, AgentDefinition>
   - `tools/` — un fichier par tool métier (`VideoMetricsTool`, `WorkflowDiagnosticTool`, etc.)
2. Migration V9 : table `agent_runs (id, agent_id, admin_id, status, input_json, output_json, tokens_in, tokens_out, cost_usd, started_at, finished_at)`
3. Configuration sécurité :
   - Chaque agent a un scope (`READ_ONLY`, `READ_WRITE_LIMITED`, `READ_WRITE_FULL`)
   - Whitelist des tools autorisés par agent
   - Rate limit par admin (10 runs/heure par défaut)
4. Observabilité : Micrometer counters/timers `ai_agent_runs_total{agent_id, status}`, `ai_agent_tokens_in/out`, `ai_agent_cost_usd`
5. Dashboard admin "AI Agents" : liste runs récents, coût mensuel, latence moyenne

### Acceptance
- Endpoint POST `/api/ai/agents/test/run` répond avec un agent dummy qui retourne juste "hello"
- Run loggé en DB avec coût/tokens
- Métriques Prometheus exposées

---

## Livrable 3.2 — Agent Content Strategist

**Effort** : 12h.

### Rôle
Analyse les performances passées et propose des sujets/formats à fort potentiel.

### À faire
1. Tools backend :
   - `getVideoMetricsTool(period, accountId)` → JSON `[{contentIdeaId, views, likes, completion}]`
   - `getCategoryPerformanceTool()` → top categories par engagement
   - `searchTrendingTopicsTool(category)` → appels TikTok Discovery API + Pexels populaires
   - `proposeIdeasTool(count, constraints)` → renvoie `[{topic, format, hook, rationale}]`
2. System prompt côté backend (`prompts/content-strategist.md`) — pas en DB
3. UI admin : nouveau bloc "Suggestions IA" en haut de la library
   - Bouton "Générer 5 suggestions"
   - Chaque suggestion → bouton "Lancer le workflow" qui pré-remplit la création
4. Modèle : Claude Sonnet 4.6 (équilibre coût/qualité)

### Acceptance
- 5 suggestions cohérentes avec les perfs historiques
- Coût < $0.05 par run
- Click sur suggestion → injecte dans le workflow generate

---

## Livrable 3.3 — Agent Script Quality Reviewer

**Effort** : 8h.

### Rôle
Avant de lancer le rendu Shotstack (étape coûteuse), un agent relit le script et le note.

### À faire
1. Tool `analyzeScriptTool(script, topic, caption)` →
   ```json
   {
     "score": 0-100,
     "hookStrength": 0-10,
     "lengthFit": "good|too_short|too_long",
     "ctaQuality": 0-10,
     "tikTokGuidelinesCompliance": "ok|warnings|violations",
     "issues": ["..."],
     "suggestedRewrite": "..." (optionnel)
   }
   ```
2. Hook automatique : avant `triggerRenderTemplateWorkflow`, appeler le reviewer
3. Si `score < 60` → bloquer + afficher le rapport, demander confirmation pour forcer
4. Modèle : Claude Haiku 4.5 (rapide, peu cher)

### Acceptance
- Économie estimée Shotstack : ~30 % de renders évités sur scripts faibles
- Coût agent < $0.01 par script analysé
- Override admin disponible

---

## Livrable 3.4 — Agent Pipeline Doctor

**Effort** : 10h.

### Rôle
Surveille les `failed_workflow_runs` et propose diagnostic + fix.

### À faire
1. Tools :
   - `getRunLogsTool(runId)` → logs structurés
   - `getPipelineEventsTool(contentIdeaId)` → timeline événements
   - `getWorkflowConfigTool(workflowType)` → config n8n
   - `retryWorkflowTool(runId, modifiedPayload?)` (READ_WRITE_LIMITED)
   - `notifyOpsTool(message, severity)` → Slack
2. Worker `@Scheduled` toutes les 15min : pour chaque run failed > 1h, lance le doctor
3. Output : `{rootCause, suggestedAction, autoRetryEligible: bool}`
4. Si `autoRetryEligible` → retry auto avec `idempotency-key` modifié
5. Dashboard "Incidents" admin : liste failures + bouton "Diagnostiquer maintenant"

### Acceptance
- 60 % des failures transitoires self-healed sans intervention admin
- Diagnostic en français pour les non self-healable
- Audit log des retry auto

---

## Livrable 3.5 — Agent Caption Optimizer

**Effort** : 4h.

### Rôle
Génère 3 variantes de caption SEO TikTok à partir du script.

### À faire
1. Tool `optimizeCaptionTool(script, topic, targetAudience?)` → 3 variantes + 5 hashtags chacune
2. UI étape upload : section "Captions générées" + radio pour choisir
3. Tracker quelle variante est choisie → metric pour A/B futur
4. Modèle : Claude Haiku

### Acceptance
- 3 variantes distinctes, < 150 caractères
- Hashtags pertinents
- Coût < $0.005 par appel

---

## Livrable 3.6 — Agent Accounts Health Monitor

**Effort** : 6h.

### Rôle
Explique en langage humain l'état des services + propose actions.

### À faire
1. Tool `getAccountsSnapshotTool()` → tous les services + quotas + tokens expiry
2. Output structuré : `[{provider, status, severity, message, suggestedAction}]`
3. UI admin : encart "Santé des comptes" sur le dashboard avec ces messages
4. Refresh toutes les 5min

### Acceptance
- Messages en français clair, actionnables
- Pas de bruit (silencieux quand tout va bien)

---

## Livrable 3.7 — Agent Onboarding & Help (chat)

**Effort** : 14h.

### À faire
1. Embeddings : indexer la doc projet + le schéma OpenAPI dans pgvector ou ChromaDB
2. Backend `ChatController` avec streaming SSE
3. Tools read-only : `searchDocsTool`, `searchAuditLogTool`, `explainEndpointTool`
4. UI : icône chat flottante en bas-droite, ouvre un panneau
5. History par admin (limited 30 derniers msgs)
6. Modèle : Claude Sonnet (tool-use loop)

### Acceptance
- Réponses citées avec liens vers la doc
- Pas d'hallucination de features inexistantes
- Streaming token par token

---

## Livrable 3.8 — Calendar / Scheduler

**Effort** : 12h.

### À faire
1. Migration V10 : table `scheduled_publishes (id, content_idea_id, scheduled_at, status, created_by, executed_at)`
2. Worker `@Scheduled` minute-by-minute : déclenche les publishes dont `scheduled_at` est passé
3. UI : composant `<DateTimePicker>` dans la dernière étape du journey + page "Planning" avec vue calendrier
4. Annulation possible avant exécution

### Acceptance
- Publication déclenchée à ±30s de l'heure prévue
- Annulation fonctionne
- Vue calendrier mensuel/hebdo

---

## Livrable 3.9 — A/B testing

**Effort** : 16h.

### À faire
1. Migration V11 : tables `ab_tests`, `ab_test_variants`, `ab_test_results`
2. UI : créer un test → choisir 2 variantes (caption ou thumbnail), assigner à 2 comptes différents
3. Worker : récupère métriques 24h/72h/7j après publication
4. Dashboard : winner + significance statistique (test du χ²)

### Acceptance
- Test clos automatiquement après 7j
- Recommendation "winner" basée sur completion rate

---

## Livrable 3.10 — Templates Shotstack

**Effort** : 10h.

### À faire
1. Migration V12 : table `shotstack_templates (id, name, description, params_schema_json, preview_url, tags, active)`
2. UI : page "Templates" avec preview + edit JSON params
3. Workflow `render-template-video.json` : prend `templateId` au lieu de logique inline
4. Migration des renders existants pour pointer sur un template par défaut

### Acceptance
- Ajouter un nouveau template ne nécessite plus de modif n8n
- Switch template via UI

---

## Livrable 3.11 — Analytics dashboard temps réel

**Effort** : 14h.

### À faire
1. Endpoint `/api/video-ops/analytics` avec :
   - Funnel : ideas créées → scriptées → renderées → publiées
   - Taux de conversion entre étapes
   - Coûts API par jour/mois (Groq + Shotstack + TikTok via tracking)
   - Top categories par engagement
2. UI : page "Analytics" avec graphiques (recharts)
3. Filtres période (7j, 30j, 90j, custom)
4. Export CSV/PDF

### Acceptance
- Charts responsive et lisibles
- Filtres persistés en URL
- Export fonctionnel

---

## Livrable 3.12 — API publique

**Effort** : 10h.

### À faire
1. Migration V13 : table `api_keys (id, key_hash, name, created_by, scopes, rate_limit, expires_at)`
2. Filter Spring Security qui authentifie via header `X-API-Key`
3. Scopes : `READ_IDEAS`, `CREATE_IDEAS`, `READ_ANALYTICS`
4. Bucket4j rate limiting par API key
5. UI admin : page "API Keys" pour créer/revoquer
6. Documentation OpenAPI publiée publique

### Acceptance
- Tiers peut intégrer en lisant uniquement la doc
- Audit log toutes les requêtes API

---

## Livrable 3.13 — Webhook entrant TikTok

**Effort** : 8h.

### À faire
1. Endpoint `POST /api/webhooks/tiktok` avec validation signature TikTok
2. Trigger workflows internes selon event type :
   - Video atteint X vues → notification Slack
   - Commentaire reçu → enregistré + analyse sentiment (Claude Haiku optionnel)
3. UI : page "Engagement" affichant commentaires reçus

### Acceptance
- Notifications Slack en temps quasi-réel
- Commentaires affichés < 10s après réception

---

## Ordre d'exécution recommandé

### Sprint A — AI infrastructure (4 semaines)
1. **3.1 Infrastructure AI** (foundation)
2. **3.5 Caption Optimizer** (le plus simple, valide la stack)
3. **3.3 Script Reviewer** (ROI immédiat sur quota)
4. **3.6 Accounts Health Monitor**

### Sprint B — Différenciation produit (4 semaines)
5. **3.2 Content Strategist**
6. **3.4 Pipeline Doctor**
7. **3.8 Scheduler**
8. **3.10 Templates Shotstack**

### Sprint C — Avancé (à étaler)
9. **3.11 Analytics dashboard**
10. **3.7 Chat assistant**
11. **3.9 A/B testing**
12. **3.13 Webhook TikTok**
13. **3.12 API publique**

---

## Total Phase 3 : ~136h ingé senior, étalable sur 10-12 semaines

---

## Estimation budgétaire AI (par mois)

Hypothèse : 100 vidéos générées par mois.

| Agent | Calls/mois | Modèle | Coût estimé |
|-------|------------|--------|-------------|
| Content Strategist | 30 (1/jour) | Sonnet 4.6 | ~$1.50 |
| Script Reviewer | 100 | Haiku 4.5 | ~$0.50 |
| Caption Optimizer | 100 | Haiku 4.5 | ~$0.50 |
| Pipeline Doctor | ~50 (failures) | Sonnet 4.6 | ~$2.50 |
| Accounts Health | 8640 (5min) | Haiku 4.5 | ~$5 |
| Chat Assistant | ~200 | Sonnet 4.6 | ~$10 |
| **Total** | | | **~$20/mois** |

Économie attendue Shotstack via Script Reviewer : ~30% de 100 renders @ $0.50 = **~$15/mois économisés**.

ROI direct positif dès le premier mois.

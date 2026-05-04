# 📋 AUDIT TESTS D'INTÉGRATION - Backend + n8n

## 1️⃣ BACKEND JAVA

### État Actuel ✅

**Tests existants (4 fichiers, ~16 tests):**
- `VideoOpsServiceTest.java` - 3 tests unitaires (mocks)
- `VideoOpsSecurityIntegrationTest.java` - 13 tests d'intégration avec H2
- `VideoOpsCallbackAuthServiceTest.java` 
- `AccountsServiceTest.java`

**Architecture testée:**
- Security (auth, CSRF, JWT)
- Callback validation (HMAC, legacy secret)
- TikTok OAuth flow
- Internal proxies (Groq, Pexels, Shotstack)

**Couverture:**
- ✅ VideoOpsController (partiellement)
- ✅ Sécurité callbacks
- ❌ TikTokUploadController (ZÉRO test)
- ❌ Endpoints workflow-runs CRUD
- ❌ Content Ideas CRUD (internal)
- ❌ TikTok Accounts CRUD (internal)

---

### GAPS CRITIQUES ❌

#### 1. **Workflow Runs - Transitions d'État**
```
Endpoints NOT TESTED:
- POST /api/video-ops/workflows/main-pipeline
- POST /api/video-ops/workflows/script-generation
- POST /api/video-ops/workflows/check-shotstack
- POST /api/video-ops/workflows/render-template
- POST /api/video-ops/workflows/init-publish
- POST /api/video-ops/workflow-runs/{runId}/complete (callbacks)
- GET /api/video-ops/workflow-runs/{runId}

Scénarios manquants:
- Idempotence: deux requêtes identiques → même run réutilisé
- Callback completion: n8n complète le workflow via POST
- Error handling: run en FAILED, TIMEOUT
- Reuse logic: contentIdeaId-based deduplication (120s window)
```

#### 2. **Callbacks & Webhook Payloads**
```
Code path tested: HMAC validation only
Code path NOT tested:
- JSON object responsePayload
- Form-encoded responsePayload  
- Nested JSON string responsePayload
- Empty/null responsePayload
- Invalid JSON handling
- Idempotent retries (same callback twice → once processed)
```

#### 3. **Internal CRUD Endpoints**
```
NOT TESTED:
- POST /api/video-ops/internal/content-ideas
- GET /api/video-ops/internal/content-ideas/{id}
- PATCH /api/video-ops/internal/content-ideas/{id}
- GET /api/video-ops/internal/tiktok-accounts?openId=X
- PATCH /api/video-ops/internal/tiktok-accounts/{id}

n8n calls these endpoints → NO integration tests
```

#### 4. **TikTokUploadController**
```
ZERO TESTS for /api/tiktok/upload
- uploadFromShotstack() logic untested
- Error handling on external upload failures untested
```

#### 5. **Error Paths**
```
NO TESTS for:
- Backend returns 500 while n8n triggers workflow
- n8n callback with backend down
- Provider timeouts (Groq, Pexels, Shotstack)
- Bad payload validation (negative ideaCount, empty category, etc.)
```

---

## 2️⃣ N8N WORKFLOWS

### Workflow Files (19)
```
init-live.json ← INIT_PUBLISH_TIKTOK
script-live.json ← SCRIPT_GENERATION  
render-live.json ← RENDER_TEMPLATE_VIDEO
check-live.json ← CHECK_SHOTSTACK
creation-live.json ← MAIN_PIPELINE
...backups & imports
```

### Code Patterns Found ✅
- Validation nodes (JS Code)
- HTTP nodes with retry/timeout
- Error handling branches
- Callback to `/api/video-ops/workflow-runs/{runId}/complete`

### GAPS ❌

#### 1. **No Structured Tests**
```
n8n workflows have NO test suite
- No case/happy-path coverage
- No error case coverage  
- No retry/timeout testing
```

#### 2. **Callback Patterns Not Uniformized**
```
Each workflow PROBABLY has different callback implementations:
- Success payload structure varies?
- Error message format?
- Retry on callback failure?
- Timeout for callback HTTP call?
```

#### 3. **LLM Output Validation Missing**
```
INIT & SCRIPT workflows call Groq LLM → CODE NODE validates output
- What if Groq returns invalid JSON?
- What if model hallucinates?
- Edge case: empty choices array?
```

#### 4. **Provider Failure Testing**
```
NOT TESTED:
- Groq down (timeout)
- Pexels rate limited
- Shotstack quota exceeded
- TikTok OAuth failure
```

---

## 3️⃣ INTEGRATION POINTS (Backend ↔ n8n)

### Critical Flows

**Flow 1: MAIN_PIPELINE**
```
Admin POST /workflows/main-pipeline
  ↓ (Backend) VideoOpsService.triggerMainPipeline()
  ↓ Creates VideoWorkflowRun(status=PENDING, type=MAIN_PIPELINE)
  ↓ n8n webhook triggered with payload
  ↓ n8n: validate → Groq LLM → script → caption → callback
  ↓ n8n POST /workflow-runs/{runId}/complete
  ↓ (Backend) VideoOpsService.completeWorkflowRun()
  ↓ Updates VideoWorkflowRun(status=SUCCEEDED)

TEST COVERAGE: 0%
```

**Flow 2: CHECK_SHOTSTACK + RENDER_TEMPLATE**
```
Admin POST /workflows/check-shotstack
  ↓ If Shotstack render already done → return SUCCEEDED (no n8n call)
  ↓ Else trigger n8n
  ↓ n8n polls Shotstack API
  ↓ n8n callback with render URL
  
TEST COVERAGE: ~5% (only mock path tested)
```

---

## 4️⃣ IDEMPOTENCE & RETRY LOGIC

### Current Backend Implementation
```java
// VideoOpsService.java
private Optional<VideoWorkflowRun> findRecentRunForIdempotency(...)
  → Looks for run in last 120 seconds (configurable)
  → If found → return existing run (skip n8n trigger)
  → Else → create new run

// Callback idempotency?
→ NO check if callback already processed
→ Same callback twice → processes twice?
```

### What Needs Testing
```
1. Idempotent trigger:
   POST /workflows/check-shotstack {contentIdeaId: 42}
   POST /workflows/check-shotstack {contentIdeaId: 42}
   → Both return SAME runId
   
2. Callback idempotency:
   n8n sends callback twice (network retry)
   → VideoWorkflowRun processed once, not twice
   
3. State transitions:
   PENDING → (timeout) → TIMEOUT (no callback)
   PENDING → (error) → FAILED (callback with status=FAILED)
```

---

## 5️⃣ TEST PLAN (Prioritized)

### Phase 1: Callbacks + Idempotence (CRITICAL)
```
Priority: 🔴 CRITICAL

Tests needed:
1. Callback completion with JSON object responsePayload
2. Callback completion with form-encoded responsePayload
3. Callback completion with nested JSON string responsePayload
4. Idempotent callback retry (same callback twice)
5. Callback with missing status field (400 BAD_REQUEST)
6. Callback timestamp validation (too old → 403)

Files to create:
- VideoOpsCallbackIntegrationTest.java (6-8 tests)
```

### Phase 2: Workflow Trigger Flow (CRITICAL)
```
Priority: 🔴 CRITICAL

Tests needed:
1. POST /workflows/main-pipeline → creates run, triggers n8n
2. POST /workflows/check-shotstack (cached) → no n8n call
3. POST /workflows/check-shotstack (uncached) → n8n call
4. Idempotent trigger (same request twice) → reuse run
5. Trigger with invalid payload → 400 BAD_REQUEST
6. Trigger without auth → 401 UNAUTHORIZED

Files to create:
- VideoOpsWorkflowIntegrationTest.java (6-8 tests)
```

### Phase 3: Internal CRUD Endpoints (MEDIUM)
```
Priority: 🟡 MEDIUM

Tests needed:
1. Create content idea with required fields
2. Patch content idea (partial update)
3. Get content idea by ID
4. Get TikTok account by openId
5. Patch TikTok account
6. Invalid patch (missing required field) → 400
7. Invalid secret header → 403

Files to create:
- VideoOpsInternalCrudIntegrationTest.java (7-8 tests)
```

### Phase 4: TikTok Upload Flow (MEDIUM)
```
Priority: 🟡 MEDIUM

Tests needed:
1. Upload from Shotstack URL
2. Upload with invalid URL → error
3. Upload service failure handling

Files to create:
- TikTokUploadIntegrationTest.java (3-4 tests)
```

### Phase 5: Error Paths & Edge Cases (LOW)
```
Priority: 🟢 LOW (after phases 1-4)

Tests needed:
1. Backend down while n8n calls it
2. Provider timeout (Groq, Pexels, Shotstack)
3. Bad payload (negative ideaCount, empty topic)
4. Concurrent workflow triggers
5. Database constraint violations

Files to create:
- VideoOpsErrorIntegrationTest.java (5-6 tests)
```

---

## 6️⃣ N8N WORKFLOW TESTING

### Strategy
```
For each critical workflow:
  1. Deploy to test n8n instance
  2. Test happy path
  3. Test error branches
  4. Test callback resilience (retry callback 3x)
  5. Monitor logs for performance
```

### Workflows to Test First
```
Priority 1:
- init-publish-tiktok (callback, validation)
- script-generation (LLM output validation)

Priority 2:
- check-shotstack (polling, caching)
- render-template (HTTP retry)

Priority 3:
- main-pipeline (complex flow)
```

---

## 7️⃣ SUMMARY

| Layer | Current | Gap | Effort |
|-------|---------|-----|--------|
| **Callback Resilience** | ~5% | Retry, payload formats, idempotence | 2d |
| **Workflow Triggers** | ~10% | All 5 workflow types, state transitions | 2d |
| **Internal CRUD** | 0% | 5 endpoints × 3-4 scenarios | 1.5d |
| **Error Paths** | 0% | Provider failures, bad data | 1.5d |
| **n8n Workflows** | 0% | Happy path + error cases per workflow | 3d |
| **TOTAL** | ~5% → 80% | | **10 days** |

---

## 📌 NEXT STEPS

1. ✅ Read this audit (done)
2. → Create callback integration tests (Phase 1)
3. → Create workflow trigger tests (Phase 2)
4. → Create n8n test suite (separate)


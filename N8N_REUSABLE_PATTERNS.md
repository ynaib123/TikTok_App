# n8n TikTok Workflows - Reusable Patterns & Templates

## 🧩 Building Blocks for New Workflows

Use these patterns to build new workflows consistently and maintainably.

---

## Pattern 1: Input Validation

**When:** First step after webhook entry  
**Purpose:** Fail fast, catch invalid inputs early  
**Complexity:** Low

### Implementation

**Step 1: Extract & Prepare**
```
Node: "Extract Body"
Type: Set
Config: { mode: "each", expression: "$json.body" }

↓

Node: "Prepare Context"
Type: Set
Config:
  contentIdeaId: = $json.contentIdeaId
  timestamp: = new Date().toISOString()
  caller: = $env.HTTP_CALLER_ID || "unknown"
```

**Step 2: Validate with If Node**
```
Node: "Validate Inputs"
Type: If
Conditions:
  - contentIdeaId is not null
  - contentIdeaId > 0
  - topic is not empty
  - category is not empty
Combinator: AND

TRUE → Continue to processing
FALSE → Log Validation Error
```

**Step 3: Log Errors**
```
Node: "Log Validation Error"
Type: Set
Config:
  error: "Input validation failed"
  missingFields: = $json.contentIdeaId ? '' : 'contentIdeaId; ' ...
  timestamp: = new Date().toISOString()
  contentIdeaId: = $("Prepare Context").item.json.contentIdeaId
```

### Reusable Snippet

```json
{
  "validationNode": {
    "type": "If",
    "conditions": [
      {
        "leftValue": "={{ $json.field1 }}",
        "operator": {"type": "string", "operation": "notEmpty"}
      },
      {
        "leftValue": "={{ Number($json.field2 || 0) > 0 }}",
        "operator": {"type": "boolean", "operation": "equals"},
        "rightValue": true
      }
    ],
    "combinator": "and"
  }
}
```

---

## Pattern 2: HTTP Call with Retry & Error Handling

**When:** Any external API call  
**Purpose:** Resilient API integration  
**Complexity:** Medium

### Implementation

```
Node: "HTTP: Call External API"
Type: HTTP Request
Config:
  method: POST
  url: https://api.example.com/endpoint
  headers:
    - Authorization: Bearer $env.API_KEY
  retry:
    maxRetries: 2
    delayMultiplier: 2
    initialDelay: 1000
  timeout: 30000
  response:
    fullResponse: true

├─ SUCCESS (200-299)
│  └─ Parse & Validate Response (Code/If)
│     └─ Continue
│
└─ ERROR (timeout/connection)
   └─ Caught by retry config
   └─ After 3 attempts: error branch
      └─ Log & classify (If node)
         ├─ Transient → Pause For Retry
         └─ Permanent → Callback Error
```

### Reusable Snippet

```json
{
  "httpWithRetry": {
    "type": "HTTP Request",
    "parameters": {
      "method": "POST",
      "url": "={{ $env.API_ENDPOINT }}",
      "sendHeaders": true,
      "headerParameters": {
        "parameters": [
          {"name": "Content-Type", "value": "application/json"},
          {"name": "Authorization", "value": "={{ 'Bearer ' + $env.API_KEY }}"}
        ]
      },
      "options": {
        "retry": {
          "maxRetries": 2,
          "delayMultiplier": 2,
          "initialDelay": 1000
        },
        "timeout": 30000
      }
    }
  }
}
```

---

## Pattern 3: JSON Parsing & Validation

**When:** Need to parse and validate external JSON  
**Purpose:** Catch parsing errors early  
**Complexity:** Low

### Implementation

**Step 1: Parse**
```
Node: "Parse JSON"
Type: Code (keep under 30 lines)
Code:
  const raw = String($json.choices?.[0]?.message?.content || '').trim();
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '').trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (e) { throw new Error('JSON invalid'); }
  return [{ json: parsed }];
```

**Step 2: Validate**
```
Node: "Validate Fields"
Type: If
Conditions:
  - $json.script is not empty
  - ($json.script).length >= 10
  - $json.caption is not empty
Combinator: AND
```

**Step 3: Normalize**
```
Node: "Normalize Output"
Type: Set
Config:
  script: = String($json.script).slice(0, 300)
  caption: = String($json.caption).slice(0, 150)
  hook: = String($json.hook).slice(0, 100)
```

### Reusable Snippet

```javascript
// JSON Parsing Code Node (20 lines max)
const raw = String($json.response || '').trim();
const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
let parsed;
try { 
  parsed = JSON.parse(cleaned); 
} catch (e) { 
  throw new Error('Response JSON invalid: ' + cleaned.slice(0, 100)); 
}
if (!parsed.field1) throw new Error('field1 missing');
return [{ json: parsed }];
```

---

## Pattern 4: Data Transformation (No Code)

**When:** Need to reshape/normalize data  
**Purpose:** Keep transformations declarative  
**Complexity:** Low

### Implementation

```
Node: "Transform Data"
Type: Set
Mode: Custom Data
Config:
  id: = $json.item_id
  name: = String($json.item_name).trim().slice(0, 100)
  status: = $json.status || 'pending'
  created_at: = $json.created_at || new Date().toISOString()
  metadata: = {
    source: 'api',
    workflow: 'process-items',
    version: '2'
  }
```

**Benefits:**
- ✅ No Code node overhead
- ✅ Easy to modify in UI
- ✅ Self-documenting (field list)
- ✅ Fast (no JS execution)

### Pattern for Common Transforms

```json
{
  "setNodeTransform": {
    "type": "Set",
    "parameters": {
      "mode": "custom",
      "customData": {
        "// Extraction": "= $json.nested.field",
        "// Cleanup": "= String($json.text).trim()",
        "// Truncation": "= String($json.text).slice(0, 100)",
        "// Defaults": "= $json.value || 'default'",
        "// Calculation": "= Number($json.a) + Number($json.b)",
        "// Date": "= new Date().toISOString()"
      }
    }
  }
}
```

---

## Pattern 5: Error Classification & Recovery

**When:** Need to handle errors intelligently  
**Purpose:** Distinguish transient vs permanent errors  
**Complexity:** Medium

### Implementation

```
Node: "Classify Error"
Type: If
Condition: 
  error includes ("timeout", "connection", "ECONNREFUSED")
TRUE → Transient (retry-able)
FALSE → Permanent (needs investigation)

├─ TRANSIENT
│  └─ Node: "Pause For Retry"
│     Type: Set
│     Config:
│       action: "pause_for_review"
│       reason: "Transient error - operator can retry"
│       error: = $json.message
│
└─ PERMANENT
   └─ Node: "Prepare Callback Error"
      Type: Set
      Config:
        action: "callback_backend"
        status: "FAILED"
        error: = $json.message
      
      └─ Node: "Callback Error Handler"
         Type: Code (error callback HTTP)
```

### Reusable Snippet

```
Conditions for Transient:
- message contains "timeout"
- message contains "connection refused"
- message contains "ECONNREFUSED"
- message contains "ETIMEDOUT"
- statusCode in [408, 429, 502, 503, 504]

Everything else → Permanent
```

---

## Pattern 6: Backend Integration (Update + Callback)

**When:** Need to save state to backend and notify  
**Purpose:** Keep backend in sync  
**Complexity:** Medium

### Implementation

**Step 1: Update State**
```
Node: "HTTP: Update Backend"
Type: HTTP Request
Method: PATCH
URL: = baseUrl + '/api/resource/' + $json.id
Body:
  {
    "status": "processing",
    "result": $json.result,
    "updated_at": new Date().toISOString()
  }
```

**Step 2: Respond Success**
```
Node: "Respond Success"
Type: Respond to Webhook
Status: 200
Body:
  {
    "ok": true,
    "id": $json.id,
    "status": "processing"
  }
```

**Step 3: Callback on Completion**
```
Node: "Callback Success"
Type: Code
Purpose: Notify backend workflow is done
Config:
  - POST to /api/workflow-runs/{workflowRunId}/complete
  - Status: SUCCEEDED
  - Retry: 3x with exponential backoff
  - Timeout: 20s
```

### Reusable Callback Code

```javascript
const http = require('http');
const { URL } = require('url');
const baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '');
const callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');
const workflowRunId = Number($json.workflowRunId || 0);

if (!baseUrl || !callbackSecret || !workflowRunId) {
  throw new Error('Missing callback config');
}

const body = JSON.stringify({
  status: 'SUCCEEDED',
  message: 'Workflow completed',
  responsePayload: JSON.stringify({ id: $json.id, status: $json.status })
});

const url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');
const response = await new Promise((resolve, reject) => {
  let attempts = 0;
  const maxAttempts = 3;
  
  const tryRequest = () => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Video-Ops-Callback-Secret': callbackSecret
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode || 0 }));
    });
    
    req.on('error', () => {
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryRequest, Math.pow(2, attempts) * 1000);
      } else {
        reject(new Error('Callback failed after ' + maxAttempts + ' attempts'));
      }
    });
    
    req.setTimeout(20000, () => {
      req.destroy();
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryRequest, Math.pow(2, attempts) * 1000);
      } else {
        reject(new Error('Callback timeout'));
      }
    });
    
    req.write(body);
    req.end();
  };
  
  tryRequest();
});

if (response.statusCode < 200 || response.statusCode >= 300) {
  throw new Error('Callback failed: ' + response.statusCode);
}

return [{ json: { ok: true } }];
```

---

## Pattern 7: Structured Logging

**When:** Every error path  
**Purpose:** Enable debugging and monitoring  
**Complexity:** Low

### Implementation

```
Node: "Log Error"
Type: Set
Config:
  status: "FAILED"
  error: = $json.message || 'Unknown error'
  error_type: = $json.statusCode ? 'http_error' : 'unknown'
  contentIdeaId: = $json.contentIdeaId
  workflowId: = "script-generation"
  nodeFailedAt: = "HTTP: Call LLM"
  timestamp: = new Date().toISOString()
  duration_ms: = execution_end - execution_start
  
→ This entire object is automatically logged in n8n DB
```

### Querying Logs

```bash
# All failures in last 24h
curl 'http://n8n:5678/api/v1/executions?workflowId=xyz&status=failed' | jq '.data[] | select(.endedAt > now() - 86400)'

# Failures by error type
curl 'http://n8n:5678/api/v1/executions?workflowId=xyz&status=failed' | jq 'group_by(.data.error_type)'

# Failed contentIdeaIds (for replay)
curl 'http://n8n:5678/api/v1/executions?workflowId=xyz&status=failed' | jq '.data[] | .contentIdeaId' | sort | uniq
```

---

## 🔧 Checklist: Building a New Workflow

```
□ Step 1: Define Input Schema
  - Required fields?
  - Validation rules?
  - Example payload?

□ Step 2: Map Processing Steps
  - External APIs needed?
  - Data transforms?
  - Error scenarios?

□ Step 3: Build Scaffold
  - Webhook → Extract → Prepare → Validate
  - Processing (use HTTP nodes)
  - Save → Respond Success
  - Error paths with classification

□ Step 4: Add Resilience
  - Retry config on HTTP nodes
  - Error classification (If node)
  - Pause/resume for transient errors
  - Callback on permanent errors

□ Step 5: Add Observability
  - Structured logging at each error
  - Timestamp everything
  - Include contextual IDs (contentIdeaId, etc)
  - Test: Can you query failures by ID?

□ Step 6: Document
  - What does each node do?
  - When does it pause/fail?
  - How to debug common errors?
  - Update this runbook

□ Step 7: Test
  - Happy path (normal flow)
  - Network timeout → pause → resume
  - Validation failure → callback
  - Backend down → pause → recover
```

---

## 📈 Scalable Architecture

### Single Workflow Pattern
```
Webhook → Validate → Process → Save → Respond
                       ↓
                    Callback on Error
```

### Multi-Step Workflow Pattern
```
Trigger 1 (Webhook) → Queue Items
                       ↓
Trigger 2 (Scheduled) → Process Queued Items
                       ├─ Success → Update Status
                       └─ Error → Retry/Dead Letter
                       
Monitoring (Scheduled) → Check for stuck items
```

### For TikTok Flows:
```
creation-ideas (generate) → queue
script-generation (process) → queue  
render-template (process) → queue
check-shotstack (poll) → mark done
init-publish (publish) → notify
```

Each workflow is **independent**, **retryable**, **observable**.

---

## 🎯 Success Template

Copy this when creating new workflow:

```
Workflow Name: [name]
Purpose: [what does it do]
Trigger: [webhook/schedule/other]
Processing: [external services used]

Input Schema:
- field1 (type): description
- field2 (type): description

Processing Steps:
1. Validate inputs (If node)
2. Call API (HTTP with retry)
3. Transform (Set node)
4. Save (HTTP with retry)

Error Handling:
- Transient (timeout/connection) → Pause
- Permanent (validation/quota) → Callback

Observability:
- Log: status, error, contentIdeaId, timestamp
- Query: all failures in last 24h by contentIdeaId

Testing:
- [ ] Happy path works
- [ ] Network timeout pauses & resumes
- [ ] Validation error triggers callback
- [ ] Logs are queryable
```

---

## 🚀 Performance Tips

- **HTTP nodes:** Timeout = max_expected_time + 5s
- **Retries:** maxRetries = 2 (3 total attempts)
- **Delays:** initialDelay = 1000ms (increase with delayMultiplier)
- **Set nodes:** Faster than Code nodes (use when possible)
- **If nodes:** Preferred over Code for conditional logic
- **Code nodes:** Keep < 50 lines, single responsibility

---

This template library should enable teams to build new workflows with consistent quality and maintainability! 🎉

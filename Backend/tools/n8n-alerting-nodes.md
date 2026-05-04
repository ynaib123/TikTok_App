# n8n Alerting Nodes — Reusable

Centralized alerting via backend endpoint `POST /api/video-ops/internal/alerts/notify`.

Header required: `X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}`

## Wiring (place on each error branch of init-publish, render-live, check-live, creation-live)

```
[Failing Node]
   ↓ (on error)
[Code: Classify Error]
   ↓
[IF: shouldAlert?]
   YES → [HTTP: Alert Backend] → [Callback: Error] → [Respond: Error]
   NO  → [Wait + Retry]
```

## Node 1 — Code: "Classify Error"

```javascript
const attempt = Number($('Validate Input').item.json.attemptNumber || 1);
const maxAttempts = 3;
const errorRaw = $input.item.json;
const errorMsg =
  errorRaw.message ||
  errorRaw.error ||
  errorRaw?.error?.message ||
  JSON.stringify(errorRaw).slice(0, 500);

const fatalKeywords = ['401', '403', 'token', 'expired', 'unauthorized', 'forbidden', 'invalid_grant'];
const isFatal = fatalKeywords.some(k => errorMsg.toLowerCase().includes(k));

return [{
  json: {
    shouldAlert: isFatal || attempt >= maxAttempts,
    isFatal,
    attempt,
    maxAttempts,
    errorMsg,
    workflowType: $workflow.name,
    runId: $('Validate Input').item.json.workflowRunId || null,
    contentIdeaId: $('Validate Input').item.json.contentIdeaId || null,
    node: $('Failing Node')?.error?.node?.name || 'unknown',
    n8nUrl: `${$env.N8N_BASE_URL || ''}/workflow/${$workflow.id}/executions/${$execution.id}`,
  }
}];
```

## Node 2 — HTTP Request: "Alert Backend"

- Method: `POST`
- URL: `={{$env.BACKEND_BASE_URL}}/api/video-ops/internal/alerts/notify`
- Authentication: None
- Headers:
  - `Content-Type: application/json`
  - `X-Video-Ops-Internal-Secret: ={{$env.APP_VIDEO_OPS_INTERNAL_API_SECRET}}`
- Send body: JSON, Specify Body Using JSON
- JSON Body:

```json
{
  "workflowType": "={{$json.workflowType}}",
  "runId": "={{$json.runId ? String($json.runId) : null}}",
  "contentIdeaId": "={{$json.contentIdeaId ? String($json.contentIdeaId) : null}}",
  "errorMessage": "={{$json.errorMsg}}",
  "node": "={{$json.node}}",
  "attempt": "={{$json.attempt}}",
  "maxAttempts": "={{$json.maxAttempts}}",
  "fatal": "={{$json.isFatal}}",
  "severity": "CRITICAL",
  "n8nUrl": "={{$json.n8nUrl}}"
}
```

- Options → Continue On Fail: ON (alert failure must not block the error branch)
- Timeout: 8000ms

## Backend env requirements

```
APP_ALERTING_ENABLED=true
APP_ALERTING_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
APP_ALERTING_COOLDOWN_SECONDS=300
APP_ALERTING_RATE_LIMIT_MAX_ALERTS=10
APP_ALERTING_RATE_LIMIT_WINDOW_SECONDS=600
APP_ALERTING_STUCK_RUN_THRESHOLD_SECONDS=600
APP_ALERTING_STUCK_RUN_CHECK_INTERVAL_MS=120000
```

## Anti-spam guarantees handled by the backend

| Concern | Where handled |
|---|---|
| Same idea + same workflow alert spam | `alert_cooldown` row keyed on `workflowType:contentIdeaId:errorHash` (5 min cooldown) |
| Error message variants (e.g. different IDs) | error message normalized + SHA-256 hashed before keying |
| Alert flood from systemic outage | Global rate limit (10 alerts / 10 min) → digest message instead |
| Workflow that never completes | `StuckWorkflowRunDetector` scheduled job, every 2 min |
| Webhook unreachable | Logged + result `failed`; no exception bubbles to caller |

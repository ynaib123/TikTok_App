# Shared n8n sub-workflows

These two workflows are reusable building blocks called from every pipeline workflow that needs to either (a) sign a callback to the backend or (b) report a failure.

## Files

| Workflow              | Purpose                                                                                       |
|-----------------------|-----------------------------------------------------------------------------------------------|
| `_callback_hmac.json` | Computes the HMAC `X-Workflow-Timestamp` + `X-Workflow-Signature` headers for the backend's `/api/video-ops/workflow-runs/:id/complete` endpoint. |
| `_error_handler.json` | Marks a `VideoWorkflowRun` as `FAILED` on the backend (HMAC-signed) and forwards the error to Slack alerting if `APP_ALERTING_SLACK_WEBHOOK_URL` is set. |

## Import procedure

1. Open the n8n UI at `http://localhost:5678`.
2. **Workflows → Import from file** → pick `_callback_hmac.json`.
3. Activate the workflow (toggle in top right). Note the workflow ID shown in the URL.
4. Repeat for `_error_handler.json`.
5. In each calling pipeline workflow, replace the inline HMAC / alerting Code node with an **Execute Workflow** node pointing at the imported sub-workflow ID.

## Calling pattern

### Callback HMAC
```jsonc
// Execute Workflow → _callback_hmac
// Input :
{
  "workflowRunId": "{{ $json.workflowRunId }}",
  "body": {
    "status": "SUCCEEDED",
    "responsePayload": "{{ JSON.stringify($json) }}"
  }
}
// Output : { timestamp, signature, method, path, body, bodyJson }
// Wire those into the next HTTP Request node as headers + body.
```

### Error handler
```jsonc
// Execute Workflow → _error_handler
// Input :
{
  "workflowRunId": "{{ $json.workflowRunId }}",
  "errorMessage": "{{ $node['Validate Input'].error.message }}",
  "errorPayload": { "stage": "validate-input" }
}
// Output : { failed, completionStatus, backendStatus, backendBody }
```

## Required env vars

Both sub-workflows expect these env vars to be available in the n8n container (already set in `docker-compose.yml`):

- `APP_VIDEO_OPS_BACKEND_BASE_URL` — e.g. `http://backend:8080`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET` — primary
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET` — legacy fallback
- `APP_ALERTING_SLACK_WEBHOOK_URL` — optional, alerting only

## Why sub-workflows?

Today the HMAC computation is duplicated in `init-live.json`, `check-live.json` and `idea-script-fused.json`. Any change to the canonical signature payload (`METHOD\nPATH\nTS\nBODY`) currently requires editing three workflows. Centralising this logic kills that drift class entirely.

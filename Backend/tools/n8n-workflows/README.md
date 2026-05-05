# n8n workflow definitions — canonical source

These four files are the **source of truth** for every n8n workflow used by the
TikTok pipeline. Every change to a workflow must land here through a normal PR.

| File | n8n ID | Role |
| --- | --- | --- |
| `idea-script-fused.json` | `q8OpzbRoQe8W8TzY` | Generate idea + script (Groq) |
| `render-template-video.json` | `SAn6Iepn4rCpkHJg` | Build Shotstack render |
| `check-shotstack.json` | `FVCRU7rTMuMCR1J3` | Poll Shotstack render status |
| `init-publish-tiktok.json` | `ql0Tg97q1cZ12aee` | Init the TikTok publish session |

## Sync with the running n8n container

```powershell
# Push canonical → local n8n (use after editing JSON here)
pwsh Backend/tools/publish-n8n-workflows.ps1

# Pull local n8n → canonical (use after editing in the n8n UI)
pwsh Backend/tools/publish-n8n-workflows.ps1 -Export
```

`n8n-local/*.json` snapshots are **derived**, not authoritative. See
`n8n-local/README.md`.

## Contract requirements

Every workflow's HTTP callback to the backend MUST send:

- `X-Request-Id` — value received in the trigger header (propagated end-to-end)
- `X-Video-Ops-Callback-Secret` — `$env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET`
- `X-Workflow-Contract-Version` — current contract major (`1`)

See `WorkflowContract.java` (backend) for the version constant and assertions.

## Shared callback helper

`callback-helper.js` (sibling file) is the reference implementation of a
backend callback: uniform headers, exponential backoff retry, and a uniform
payload shape (`{ status, message, responsePayload }`). The body of its
`callbackBackend(...)` function is what every "Callback Success" / "Callback
Error" Code node in our four workflows should run.

Workflow-side wiring:

1. **Capture the trace.** In the Webhook node's downstream "Validate Input"
   Code node, grab `const traceId = $json.headers?.['x-request-id'] || null;`
   and forward it on every output item.
2. **Call the helper.** In the success path Code node:
   ```js
   return [{ json: await callbackBackend({
     workflowRunId: $json.workflowRunId,
     status: 'SUCCEEDED',
     message: 'Render complete.',
     responsePayload: { renderId: $json.renderId },
     traceId: $json.traceId,
   }) }];
   ```
3. **Same on error.** The "Prepare Error" → "Callback Error" pair must also
   pass `traceId` and use the helper.

The helper keeps every workflow consistent, removes the ~120 lines of
duplicated HTTP plumbing currently in each Code node, and makes the contract
upgradable in one place.

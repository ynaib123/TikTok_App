/* eslint-disable */
// =============================================================================
//  Shared n8n callback helper.
//  Paste the body of `callbackBackend(...)` into any "Callback Success" /
//  "Callback Error" Code node inside an n8n workflow.
//
//  Contract (matches Backend/.../WorkflowContract.java and the docs in
//  Backend/tools/n8n-workflows/README.md):
//
//   - X-Request-Id              propagated from the inbound webhook headers.
//   - X-Workflow-Contract-Version  '1' (bump in lockstep with the backend).
//   - X-Video-Ops-Callback-Secret  $env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET
//
//  Returns the parsed callback response (or throws on definitive failure)
//  with a uniform retry/backoff and uniform payload shape.
// =============================================================================

/**
 * @param {{
 *   workflowRunId: number,
 *   status: 'SUCCEEDED' | 'FAILED',
 *   message: string,
 *   responsePayload?: unknown,
 *   traceId?: string | null,
 *   maxAttempts?: number
 * }} input
 */
async function callbackBackend(input) {
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');

  const baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '');
  const callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');
  const workflowRunId = Number(input.workflowRunId || 0);
  const traceId = String(input.traceId || '').trim();
  const maxAttempts = Math.max(1, Math.min(5, Number(input.maxAttempts || 3)));

  if (!baseUrl) throw new Error('CALLBACK_MISSING_BASE_URL');
  if (!callbackSecret) throw new Error('CALLBACK_MISSING_SECRET');
  if (!workflowRunId || workflowRunId <= 0) throw new Error('CALLBACK_MISSING_RUN_ID');

  const body = JSON.stringify({
    status: input.status,
    message: String(input.message || '').slice(0, 500),
    responsePayload: typeof input.responsePayload === 'string'
      ? input.responsePayload
      : JSON.stringify(input.responsePayload ?? {}),
  });

  const url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');
  const client = url.protocol === 'https:' ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Video-Ops-Callback-Secret': callbackSecret,
    'X-Workflow-Contract-Version': '1',
  };
  if (traceId) {
    headers['X-Request-Id'] = traceId;
  }

  let lastError = null;
  let lastResponse = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      lastResponse = await new Promise((resolve, reject) => {
        const req = client.request({
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers,
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Callback timeout'));
        });
        req.write(body);
        req.end();
      });

      if (lastResponse.statusCode >= 200 && lastResponse.statusCode < 300) {
        return {
          ok: true,
          workflowRunId,
          status: input.status,
          callbackStatusCode: lastResponse.statusCode,
        };
      }
      lastError = 'HTTP ' + lastResponse.statusCode;
    } catch (err) {
      lastError = (err && err.message) ? err.message : String(err);
    }

    if (attempt < maxAttempts) {
      // exponential backoff: 500ms * 2^(attempt-1) — capped at 4s
      const backoffMs = Math.min(4000, 500 * Math.pow(2, attempt - 1));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw new Error('CALLBACK_FAILED: ' + (lastError || 'unknown'));
}

module.exports = { callbackBackend };

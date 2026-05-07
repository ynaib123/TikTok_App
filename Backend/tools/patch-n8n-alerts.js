// Patches the 4 critical n8n workflows to insert alerting nodes
// on every error branch leading to "Callback: Error (best effort)".
//
// Strategy: redirect every error connection that pointed to "Callback: Error (best effort)"
// (or a similar terminal error node) to first hit "Build Alert Payload" -> "HTTP: Alert Backend"
// and then continue to the original error callback node.
//
// Idempotent: re-running will detect existing alert nodes and skip.

const fs = require('fs');
const https = require('http');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZWNkMWE3YS1iMGMxLTQxNmYtODZjNC1hOTBiODljODI4YjciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZDA5ZmY2ODEtZmU5ZS00MGVmLWIxNGQtYmE2NDhjYWZiZGMxIiwiaWF0IjoxNzc3ODM1NjU5fQ._uVIs5O_50cElamr7TCVREc8miQ_-4qxcwHBT18-z-M';
const BASE = 'http://localhost:5678/api/v1';

const TARGETS = [
  { id: 'ql0Tg97q1cZ12aee', name: 'init-publish-tiktok-fixed',     errorTerminalKeywords: ['callback: error', 'callback error', 'respond: error', 'respond error'] },
  { id: 'renderRemotion01', name: 'render-template-video-remotion', errorTerminalKeywords: ['callback: error', 'callback error', 'respond: error', 'respond error'] },
  { id: 'q8OpzbRoQe8W8TzY', name: 'idea-script-generation-fused',  errorTerminalKeywords: ['prepare error', 'callback error', 'callback: error', 'respond error'] },
];

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const req = https.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`${res.statusCode}: ${chunks}`));
        try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const PAYLOAD_NODE_NAME = 'Build Alert Payload';
const ALERT_NODE_NAME = 'HTTP: Alert Backend';

function buildPayloadNode(yPos) {
  return {
    parameters: {
      jsCode:
`// Build Slack alert payload from upstream node error context
const errRaw = $input.item.json;
const errMsg = errRaw?.error?.message || errRaw?.message || errRaw?.error || JSON.stringify(errRaw).slice(0,500);
const fatalKw = ['401','403','token','expired','unauthorized','forbidden','invalid_grant'];
const isFatal = fatalKw.some(k => String(errMsg).toLowerCase().includes(k));
let validateInput = {};
try { validateInput = $('Validate Input').item.json || {}; } catch(e) {}
return [{
  json: {
    workflowType: $workflow.name,
    runId: validateInput.workflowRunId ? String(validateInput.workflowRunId) : null,
    contentIdeaId: validateInput.contentIdeaId ? String(validateInput.contentIdeaId) : null,
    errorMessage: String(errMsg).slice(0, 900),
    node: errRaw?.error?.node?.name || $('error').first?.()?.node?.name || 'unknown',
    attempt: validateInput.attemptNumber || 1,
    maxAttempts: 3,
    fatal: isFatal,
    severity: 'CRITICAL',
    n8nUrl: ($env.N8N_BASE_URL || 'http://localhost:5678') + '/workflow/' + $workflow.id + '/executions/' + $execution.id,
    _origError: errRaw,
  }
}];`
    },
    name: PAYLOAD_NODE_NAME,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [200, yPos],
  };
}

function buildAlertNode(yPos) {
  return {
    parameters: {
      method: 'POST',
      url: '={{$env.APP_VIDEO_OPS_BACKEND_BASE_URL}}/api/video-ops/internal/alerts/notify',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Video-Ops-Internal-Secret', value: '={{$env.APP_VIDEO_OPS_INTERNAL_API_SECRET}}' },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody:
`={{ JSON.stringify({
  workflowType: $json.workflowType,
  runId: $json.runId,
  contentIdeaId: $json.contentIdeaId,
  errorMessage: $json.errorMessage,
  node: $json.node,
  attempt: $json.attempt,
  maxAttempts: $json.maxAttempts,
  fatal: $json.fatal,
  severity: $json.severity,
  n8nUrl: $json.n8nUrl
}) }}`,
      options: { timeout: 8000 },
    },
    name: ALERT_NODE_NAME,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [400, yPos],
    onError: 'continueRegularOutput',
    continueOnFail: true,
  };
}

function findErrorTerminal(nodes, keywords) {
  for (const kw of keywords) {
    const found = nodes.find(n => n.name.toLowerCase().includes(kw));
    if (found) return found.name;
  }
  return null;
}

const ALLOWED_SETTINGS_KEYS = ['executionOrder', 'saveExecutionProgress', 'saveManualExecutions',
  'saveDataErrorExecution', 'saveDataSuccessExecution', 'executionTimeout', 'errorWorkflow', 'timezone'];

function sanitizeSettings(s) {
  if (!s || typeof s !== 'object') return { executionOrder: 'v1' };
  const out = {};
  for (const k of ALLOWED_SETTINGS_KEYS) {
    if (s[k] !== undefined) out[k] = s[k];
  }
  if (!out.executionOrder) out.executionOrder = 'v1';
  return out;
}

async function patchWorkflow(target) {
  console.log(`\n=== Patching ${target.name} (${target.id}) ===`);
  const wf = await api('GET', `/workflows/${target.id}`);
  const nodes = wf.nodes || [];
  const connections = wf.connections || {};

  if (nodes.some(n => n.name === ALERT_NODE_NAME)) {
    // Verify alert chain is actually wired; if not, remove orphans and re-patch.
    const orphan = !connections[ALERT_NODE_NAME] || !connections[PAYLOAD_NODE_NAME];
    let hasIncomingToPayload = false;
    for (const v of Object.values(connections)) {
      if (!v.error) continue;
      for (const branch of v.error) for (const c of branch) if (c.node === PAYLOAD_NODE_NAME) hasIncomingToPayload = true;
    }
    if (!orphan && hasIncomingToPayload) {
      console.log('  → Already patched, skipping.');
      return;
    }
    console.log('  → Found orphan alert nodes, removing and re-patching.');
    const removeIdx = (n) => nodes.findIndex(x => x.name === n);
    [ALERT_NODE_NAME, PAYLOAD_NODE_NAME].forEach(name => {
      const i = removeIdx(name);
      if (i >= 0) nodes.splice(i, 1);
      delete connections[name];
    });
  }

  const errorTerminal = findErrorTerminal(nodes, target.errorTerminalKeywords);
  if (!errorTerminal) {
    console.log('  ⚠ No error terminal node found, skipping.');
    return;
  }
  console.log('  Error terminal node:', errorTerminal);

  // Position alerting nodes near the error terminal
  const terminalNode = nodes.find(n => n.name === errorTerminal);
  const yBase = terminalNode?.position?.[1] ?? 600;

  const payloadNode = buildPayloadNode(yBase + 200);
  const alertNode = buildAlertNode(yBase + 200);
  payloadNode.position = [(terminalNode?.position?.[0] ?? 800) - 400, yBase + 200];
  alertNode.position   = [(terminalNode?.position?.[0] ?? 800) - 200, yBase + 200];

  nodes.push(payloadNode, alertNode);

  // Redirect every "error" connection currently pointing at errorTerminal:
  //   srcNode --error--> errorTerminal
  // becomes
  //   srcNode --error--> Build Alert Payload --main--> HTTP: Alert Backend --main--> errorTerminal
  let redirected = 0;
  for (const [srcName, srcConns] of Object.entries(connections)) {
    if (!srcConns.error) continue;
    for (const branch of srcConns.error) {
      for (const conn of branch) {
        if (conn.node === errorTerminal) {
          conn.node = PAYLOAD_NODE_NAME;
          redirected++;
        }
      }
    }
  }
  console.log(`  Redirected ${redirected} error edges through alert chain.`);

  // Wire payload -> alert -> errorTerminal
  connections[PAYLOAD_NODE_NAME] = {
    main: [[{ node: ALERT_NODE_NAME, type: 'main', index: 0 }]],
  };
  connections[ALERT_NODE_NAME] = {
    main: [[{ node: errorTerminal, type: 'main', index: 0 }]],
  };

  // n8n PUT requires only specific fields; build minimal update body
  const updateBody = {
    name: wf.name,
    nodes,
    connections,
    settings: sanitizeSettings(wf.settings),
    staticData: wf.staticData || null,
  };

  await api('PUT', `/workflows/${target.id}`, updateBody);
  console.log('  ✅ Patched.');
}

(async () => {
  for (const t of TARGETS) {
    try { await patchWorkflow(t); }
    catch (e) { console.error('  ❌ Error patching', t.name, ':', e.message); }
  }
})();

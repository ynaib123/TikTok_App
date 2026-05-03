#!/usr/bin/env node
/**
 * Génère les 5 workflows corrigés et les importe dans n8n via API REST.
 * Usage: node deploy_workflows.js
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const N8N_BASE = 'http://localhost:5678';
const N8N_API_KEY = 'tiktok-app-deploy-key-b4ba1c84d7c58198e0094aa7';
const SECRET = '2nDq4MoyD9CVHiUq4toqv3_Rl2K05Eqs7Fpjf09iPuM';
const BACKEND = 'http://backend:8080';

// ── helpers ──────────────────────────────────────────────────────
function req(method, urlStr, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', 'X-N8N-API-KEY': N8N_API_KEY, ...extraHeaders };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = mod.request({ hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, method, headers }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// ── callback code (réutilisé dans plusieurs workflows) ────────────
function callbackCode(workflowRunIdExpr, statusExpr, messageStr, payloadExpr) {
  return `const http = require('http');
const { URL } = require('url');
const baseUrl = '${BACKEND}';
const callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');
const workflowRunId = Number(${workflowRunIdExpr} || 0);
if (!callbackSecret) throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante');
if (!workflowRunId) throw new Error('workflowRunId manquant');
const body = JSON.stringify({ status: ${statusExpr}, message: '${messageStr}', responsePayload: JSON.stringify(${payloadExpr}) });
const url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let response = null; let lastError = null;
for (let attempt = 1; attempt <= 6; attempt++) {
  try {
    response = await new Promise((resolve, reject) => {
      const rq = http.request({ hostname: url.hostname, port: url.port || 80, path: url.pathname + url.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Video-Ops-Callback-Secret': callbackSecret } }, (res) => { let data = ''; res.on('data', (c) => { data += c; }); res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data })); });
      rq.on('error', reject); rq.write(body); rq.end();
    });
    if (response.statusCode >= 200 && response.statusCode < 300) break;
    lastError = 'Callback refuse: ' + response.statusCode;
    if (attempt === 6) throw new Error(lastError);
  } catch (e) { lastError = e.message; if (attempt === 6) throw e; }
  await sleep(500 * attempt);
}
if (!response || response.statusCode < 200 || response.statusCode >= 300) throw new Error(lastError || 'Callback refuse.');
return [{ json: { ...$json, callbackStatusCode: response.statusCode } }];`;
}

function hdr(extra = {}) {
  return { 'Content-Type': 'application/json', 'X-Video-Ops-Internal-Secret': SECRET, ...extra };
}

function backendUrl(path) { return `=${BACKEND}${path}`; }

// ── workflow definitions ──────────────────────────────────────────

const WORKFLOWS = [];

// 1. creation-ideas
WORKFLOWS.push({
  name: 'creation-ideas',
  filename: 'creation-ideas.json',
  webhook: 'creation-ideas',
  def: {
    name: 'creation-ideas',
    nodes: [
      { parameters: { httpMethod: 'POST', path: 'creation-ideas', responseMode: 'responseNode', options: {} }, id: 'webhook', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [-1080, 120] },
      { parameters: { jsCode: `const body = $input.first().json.body || {};\nconst category = String(body.category || '').trim();\nconst ideaCount = Number(body.ideaCount || 1);\nif (!category) throw new Error('category est obligatoire');\nif (!Number.isInteger(ideaCount) || ideaCount < 1 || ideaCount > 5) throw new Error('ideaCount doit etre entre 1 et 5');\nreturn [{ json: { category, ideaCount, workflowRunId: Number(body.workflowRunId || 0), templateId: body.templateId || null, tiktokAccountOpenId: body.tiktokAccountOpenId || null } }];` }, id: 'validate-input', name: 'Validate Input', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-820, 120] },
      { parameters: { jsCode: `const input = $input.first().json;\nreturn Array.from({ length: input.ideaCount }).map((_, i) => ({ json: { ...input, iteration: i + 1 } }));` }, id: 'expand', name: 'Expand Ideas', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-580, 120] },
      { parameters: { method: 'POST', url: 'https://api.groq.com/openai/v1/chat/completions', sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Authorization', value: "={{ 'Bearer ' + $env.GROQ_API_KEY }}" }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ { model: 'llama-3.1-8b-instant', messages: [ { role: 'user', content: 'Generate exactly one TikTok content idea for category ' + $json.category + '. Return only the idea text, no numbering, no explanation.' } ] } }}", options: {} }, id: 'groq', name: 'HTTP Request Idea', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [-340, 120] },
      { parameters: { jsCode: `return [{ json: { topic: String($json.choices?.[0]?.message?.content || '').trim(), category: $('Expand Ideas').item.json.category, workflowRunId: $('Expand Ideas').item.json.workflowRunId, templateId: $('Expand Ideas').item.json.templateId, tiktokAccountOpenId: $('Expand Ideas').item.json.tiktokAccountOpenId } }];` }, id: 'normalize', name: 'Normalize Topic', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-100, 120] },
      { parameters: { method: 'POST', url: backendUrl('/api/video-ops/internal/content-ideas'), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ category: $json.category, topic: $json.topic, status: 'new', pipelineStatus: 'idea_created', publishStatus: 'draft', platform: 'tiktok', templateId: $json.templateId || null, tiktokAccountOpenId: $json.tiktokAccountOpenId || null }) }}", options: {} }, id: 'create-row', name: 'Backend Create Content Idea', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [140, 120] },
      { parameters: { jsCode: `const items = $input.all();\nconst workflowRunId = Number($('Validate Input').first().json.workflowRunId || 0);\nreturn [{ json: { workflowRunId, createdCount: items.length } }];` }, id: 'summarize', name: 'Summarize', type: 'n8n-nodes-base.code', typeVersion: 2, position: [380, 120] },
      { parameters: { respondWith: 'json', responseBody: "={{ { ok: true, workflowRunId: $('Summarize').item.json.workflowRunId, createdCount: $('Summarize').item.json.createdCount, status: 'idea_created' } }}", options: { responseCode: 200 } }, id: 'respond', name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [620, 120] },
      { parameters: { jsCode: callbackCode("$('Summarize').item.json.workflowRunId", "'SUCCEEDED'", 'Creation ideas terminee.', '{ createdCount: Number($json.createdCount || 0) }') }, id: 'callback', name: 'Callback Success', type: 'n8n-nodes-base.code', typeVersion: 2, position: [860, 120] },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Validate Input', type: 'main', index: 0 }]] },
      'Validate Input': { main: [[{ node: 'Expand Ideas', type: 'main', index: 0 }]] },
      'Expand Ideas': { main: [[{ node: 'HTTP Request Idea', type: 'main', index: 0 }]] },
      'HTTP Request Idea': { main: [[{ node: 'Normalize Topic', type: 'main', index: 0 }]] },
      'Normalize Topic': { main: [[{ node: 'Backend Create Content Idea', type: 'main', index: 0 }]] },
      'Backend Create Content Idea': { main: [[{ node: 'Summarize', type: 'main', index: 0 }]] },
      'Summarize': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
      'Respond to Webhook': { main: [[{ node: 'Callback Success', type: 'main', index: 0 }]] },
      'Callback Success': { main: [] },
    },
    pinData: {}, meta: { templateCredsSetupCompleted: true }
  }
});

// 2. script-generation-single-llm
WORKFLOWS.push({
  name: 'script-generation-single-llm',
  filename: 'script-generation-single-llm.json',
  webhook: 'script-generation',
  def: {
    name: 'script-generation-single-llm',
    nodes: [
      { parameters: { httpMethod: 'POST', path: 'script-generation', responseMode: 'responseNode', options: {} }, id: 'webhook-script', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [-840, 120] },
      { parameters: { assignments: { assignments: [ { name: 'contentIdeaId', value: '={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}', type: 'number' }, { name: 'topic', value: "={{ String($json.body.topic || $json.topic || '').trim() }}", type: 'string' }, { name: 'category', value: "={{ String($json.body.category || $json.category || '').trim() }}", type: 'string' }, { name: 'workflowRunId', value: '={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}', type: 'number' } ] }, options: {} }, id: 'set-input', name: 'Set Input', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-600, 120] },
      { parameters: { method: 'POST', url: 'https://api.groq.com/openai/v1/chat/completions', sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Authorization', value: "={{ 'Bearer ' + $env.GROQ_API_KEY }}" }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.7, messages: [ { role: 'system', content: 'Tu generes du contenu TikTok. Retourne uniquement un JSON valide avec les cles script, caption, background_keyword.' }, { role: 'user', content: 'Categorie: ' + $json.category + '\\nTopic: ' + $json.topic + '\\nContraintes:\\n- script: francais, naturel, court, pret pour une video TikTok\\n- caption: concise avec hashtags\\n- background_keyword: un seul mot-cle visuel exploitable\\nRetourne uniquement le JSON.' } ] }) }}", options: {} }, id: 'http-groq', name: 'HTTP Request Groq', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [-320, 120] },
      { parameters: { jsCode: `const raw = String($json.choices?.[0]?.message?.content || '').trim();\nconst cleaned = raw.replace(/^\`\`\`json\\s*/i,'').replace(/^\`\`\`/i,'').replace(/\`\`\`$/i,'').trim();\nlet parsed;\ntry { parsed = JSON.parse(cleaned); } catch(e) { throw new Error('Reponse LLM non parseable: ' + cleaned.slice(0,200)); }\nreturn [{ json: { contentIdeaId: Number($('Set Input').item.json.contentIdeaId||0), workflowRunId: Number($('Set Input').item.json.workflowRunId||0), script: String(parsed.script||'').trim(), caption: String(parsed.caption||'').trim(), background_keyword: String(parsed.background_keyword||'').trim() } }];` }, id: 'code-parse', name: 'Parse JSON', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-40, 120] },
      { parameters: { method: 'PATCH', url: backendUrl('/api/video-ops/internal/content-ideas/{{ $json.contentIdeaId }}'), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ scripts: $json.script, script_status: 'done', caption: $json.caption, background_keyword: $json.background_keyword, pipeline_status: 'script_ready' }) }}", options: {} }, id: 'backend-update', name: 'Backend Update Script', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [240, 120] },
      { parameters: { respondWith: 'json', responseBody: "={{ { ok: true, contentIdeaId: $('Parse JSON').item.json.contentIdeaId, workflowRunId: $('Parse JSON').item.json.workflowRunId, status: 'script_ready' } }}", options: { responseCode: 200 } }, id: 'respond', name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [480, 120] },
      { parameters: { jsCode: callbackCode("$('Parse JSON').item.json.workflowRunId", "'SUCCEEDED'", 'Script workflow termine.', '{ contentIdeaId: Number($("Parse JSON").item.json.contentIdeaId || 0) }') }, id: 'callback-success', name: 'Callback Success', type: 'n8n-nodes-base.code', typeVersion: 2, position: [720, 120] },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Set Input', type: 'main', index: 0 }]] },
      'Set Input': { main: [[{ node: 'HTTP Request Groq', type: 'main', index: 0 }]] },
      'HTTP Request Groq': { main: [[{ node: 'Parse JSON', type: 'main', index: 0 }]] },
      'Parse JSON': { main: [[{ node: 'Backend Update Script', type: 'main', index: 0 }]] },
      'Backend Update Script': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
      'Respond to Webhook': { main: [[{ node: 'Callback Success', type: 'main', index: 0 }]] },
      'Callback Success': { main: [] },
    },
    pinData: {}, meta: { templateCredsSetupCompleted: true }
  }
});

// 3. render-template-video-with-callback
const selectPortraitCode = `const videos = $json.videos || [];
if (!videos.length) throw new Error('Aucune video Pexels retournee');
const isDirectPexels = (link) => { try { return new URL(link).hostname === 'videos.pexels.com'; } catch { return false; } };
const preferred = []; const fallback = [];
for (const video of videos) {
  for (const file of video.video_files || []) {
    if (!file || !file.link || file.file_type !== 'video/mp4') continue;
    if (!isDirectPexels(file.link)) continue;
    const width = Number(file.width || video.width || 0);
    const height = Number(file.height || video.height || 0);
    if (!width || !height || height <= width) continue;
    const item = { link: file.link, width, height };
    const isPref = (width===1080&&height===1920)||(width===720&&height===1280)||(width===540&&height===960);
    if (isPref) { preferred.push(item); } else { fallback.push(item); }
  }
}
const pick = preferred[0] || fallback.sort((a,b)=>(b.height*b.width)-(a.height*a.width))[0];
if (!pick) throw new Error('Aucune video portrait disponible sur videos.pexels.com. Essayez un autre keyword.');
return [{ json: {
  id: $('Set Input').item.json.contentIdeaId,
  workflowRunId: $('Set Input').item.json.workflowRunId,
  topic: $('Set Input').item.json.topic,
  scripts: $('Set Input').item.json.script,
  caption: $('Set Input').item.json.caption,
  image_prompt: String($('HTTP Request Image Prompt').item.json.choices?.[0]?.message?.content || '').trim(),
  background_video_url: pick.link
} }];`;

const shotstackBodyExpr = `={{ JSON.stringify((() => {
  const selected = $('Select Portrait Media').item.json;
  const cleanText = (v) => String(v||'').normalize('NFKD').replace(/[^\\x20-\\x7E]/g,' ').replace(/\\s+/g,' ').trim().slice(0,120);
  const lines = String(selected.scripts||'').split('\\n').map(l=>cleanText(l)).filter(Boolean);
  const fallback = cleanText(selected.topic||$('Set Input').item.json.topic||'Video business');
  const textLines = (lines.length?lines:[fallback]).slice(0,3);
  const titleClips = textLines.map((line,i)=>({asset:{type:'title',text:line,style:'minimal',color:'#ffffff',background:'rgba(15,15,15,0.55)'},start:i*3,length:3,position:'center'}));
  return {
    timeline:{background:'#0f0f0f',tracks:[
      {clips:[{asset:{type:'video',src:selected.background_video_url},start:0,length:15,fit:'cover'}]},
      ...(titleClips.length?[{clips:titleClips}]:[])
    ]},
    output:{format:'mp4',aspectRatio:'9:16',resolution:'hd'}
  };
})()) }}`;

const renderCallbackCode = callbackCode(
  "$('Set Input').item.json.workflowRunId",
  "'SUCCEEDED'",
  'Render Shotstack demande.',
  `{ contentIdeaId: Number($('Set Input').item.json.contentIdeaId||0), shotstackRenderId: $('HTTP Request Shotstack Render').item.json.response?.id || $('HTTP Request Shotstack Render').item.json.id || '' }`
);

WORKFLOWS.push({
  name: 'render-template-video-with-callback',
  filename: 'render-template-video-with-callback.json',
  webhook: 'render-template-video',
  def: {
    name: 'render-template-video-with-callback',
    nodes: [
      { parameters: { httpMethod: 'POST', path: 'render-template-video', responseMode: 'responseNode', options: {} }, id: 'webhook', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [-980, 100] },
      { parameters: { assignments: { assignments: [ { name: 'contentIdeaId', value: '={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}', type: 'number' }, { name: 'topic', value: "={{ String($json.body.topic || $json.topic || '').trim() }}", type: 'string' }, { name: 'script', value: "={{ String($json.body.script || $json.script || '').trim() }}", type: 'string' }, { name: 'caption', value: "={{ String($json.body.caption || $json.caption || '').trim() }}", type: 'string' }, { name: 'keyword', value: "={{ String($json.body.keyword || $json.keyword || '').trim() }}", type: 'string' }, { name: 'workflowRunId', value: '={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}', type: 'number' } ] }, options: {} }, id: 'set-input', name: 'Set Input', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-740, 100] },
      { parameters: { method: 'POST', url: 'https://api.groq.com/openai/v1/chat/completions', sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Authorization', value: "={{ 'Bearer ' + $env.GROQ_API_KEY }}" }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [ { role: 'user', content: 'Create one realistic visual prompt for a vertical TikTok business video about: ' + $json.topic + '. One sentence only.' } ] }) }}", options: {} }, id: 'groq-prompt', name: 'HTTP Request Image Prompt', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [-500, 100] },
      { parameters: { url: "={{ (() => { const raw = String($('Set Input').item.json.keyword || $('Set Input').item.json.topic || 'business'); const q = raw.replace(/[^\\w\\s-]/g,' ').replace(/\\s+/g,' ').trim().split(' ').slice(0,4).join(' ') || 'business'; return 'https://api.pexels.com/videos/search?query=' + encodeURIComponent(q) + '&per_page=15&orientation=portrait'; })() }}", sendHeaders: true, headerParameters: { parameters: [{ name: 'Authorization', value: '={{ $env.PEXELS_API_KEY }}' }] }, options: {} }, id: 'pexels', name: 'HTTP Request Pexels', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [-260, 100] },
      { parameters: { jsCode: selectPortraitCode }, id: 'select-media', name: 'Select Portrait Media', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-20, 100] },
      { parameters: { method: 'PATCH', url: backendUrl('/api/video-ops/internal/content-ideas/{{ $json.id }}'), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ shotstack_status: 'preparing', final_video_status: 'processing', render_payload: JSON.stringify($json), render_status: 'prepared', pipeline_status: 'rendering_requested' }) }}", options: {} }, id: 'update-preparing', name: 'Backend Update Preparing', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [220, 100] },
      { parameters: { method: 'POST', url: backendUrl('/api/video-ops/internal/shotstack/render'), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, sendBody: true, specifyBody: 'json', jsonBody: shotstackBodyExpr, options: {} }, id: 'shotstack-render', name: 'HTTP Request Shotstack Render', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [460, 100] },
      { parameters: { method: 'PATCH', url: backendUrl("/api/video-ops/internal/content-ideas/{{ $('Select Portrait Media').item.json.id }}"), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ shotstack_render_id: $json.response?.id || $json.id, shotstack_status: 'queued', final_video_status: 'processing', pipeline_status: 'rendering_requested' }) }}", options: {} }, id: 'update-render-id', name: 'Backend Update Render Id', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [700, 100] },
      { parameters: { respondWith: 'json', responseBody: "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackRenderId: $('HTTP Request Shotstack Render').item.json.response?.id || $('HTTP Request Shotstack Render').item.json.id, status: 'render_requested' } }}", options: { responseCode: 200 } }, id: 'respond', name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [940, 100] },
      { parameters: { jsCode: renderCallbackCode }, id: 'callback', name: 'Callback Success', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1180, 100] },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Set Input', type: 'main', index: 0 }]] },
      'Set Input': { main: [[{ node: 'HTTP Request Image Prompt', type: 'main', index: 0 }]] },
      'HTTP Request Image Prompt': { main: [[{ node: 'HTTP Request Pexels', type: 'main', index: 0 }]] },
      'HTTP Request Pexels': { main: [[{ node: 'Select Portrait Media', type: 'main', index: 0 }]] },
      'Select Portrait Media': { main: [[{ node: 'Backend Update Preparing', type: 'main', index: 0 }]] },
      'Backend Update Preparing': { main: [[{ node: 'HTTP Request Shotstack Render', type: 'main', index: 0 }]] },
      'HTTP Request Shotstack Render': { main: [[{ node: 'Backend Update Render Id', type: 'main', index: 0 }]] },
      'Backend Update Render Id': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
      'Respond to Webhook': { main: [] },
      'Callback Success': { main: [] },
    },
    pinData: {}, meta: { templateCredsSetupCompleted: true }
  }
});

// 4. check-shotstack-fixed
WORKFLOWS.push({
  name: 'check-shotstack-fixed',
  filename: 'check-shotstack-fixed.json',
  webhook: 'check-shotstack',
  def: {
    name: 'check-shotstack-fixed',
    nodes: [
      { parameters: { httpMethod: 'POST', path: 'check-shotstack', responseMode: 'responseNode', options: {} }, id: 'webhook', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [-840, 100] },
      { parameters: { assignments: { assignments: [ { name: 'contentIdeaId', value: '={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}', type: 'number' }, { name: 'workflowRunId', value: '={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}', type: 'number' } ] }, options: {} }, id: 'set-input', name: 'Set Input', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-600, 100] },
      { parameters: { method: 'GET', url: backendUrl('/api/video-ops/internal/content-ideas/{{ $json.contentIdeaId }}'), sendHeaders: true, headerParameters: { parameters: [{ name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, options: {} }, id: 'get-idea', name: 'Backend Get Content Idea', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [-360, 100] },
      { parameters: { jsCode: `const idea = $json;\nif (!idea || !idea.id) throw new Error('contentIdea introuvable.');\nif (!idea.shotstack_render_id) throw new Error('Aucun shotstack_render_id pour cette contentIdea.');\nconst status = String(idea.shotstack_status || '').toLowerCase();\nif (!['queued','rendering','preparing'].includes(status)) {\n  return [{ json: { skip: true, reason: 'shotstack_status=' + status + ' — rien a faire.', idea } }];\n}\nreturn [{ json: { skip: false, renderId: idea.shotstack_render_id, ideaId: idea.id, idea } }];` }, id: 'validate-render', name: 'Validate Render State', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-120, 100] },
      { parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id: 'skip-check', leftValue: '={{ $json.skip }}', rightValue: true, operator: { type: 'boolean', operation: 'equals' } }], combinator: 'and' }, options: {} }, id: 'if-skip', name: 'Skip if not pending', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [120, 100] },
      { parameters: { method: 'GET', url: backendUrl('/api/video-ops/internal/shotstack/render/{{ $json.renderId }}'), sendHeaders: true, headerParameters: { parameters: [{ name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, options: {} }, id: 'shotstack-status', name: 'Backend Get Shotstack Status', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [360, 100] },
      { parameters: { jsCode: `const status = String($json.response?.status || '').toLowerCase();\nconst ideaId = $('Validate Render State').item.json.ideaId;\nif (status === 'done') {\n  return [{ json: { ideaId, patch: { shotstack_status: 'done', shotstack_url: $json.response?.url || '', final_video_status: 'ready', pipeline_status: 'render_ready' }, callbackStatus: 'SUCCEEDED', callbackMessage: 'Render Shotstack termine.' } }];\n}\nif (status === 'failed') {\n  return [{ json: { ideaId, patch: { shotstack_status: 'failed', final_video_status: 'failed', pipeline_status: 'failed' }, callbackStatus: 'FAILED', callbackMessage: 'Render Shotstack en echec.' } }];\n}\nreturn [];` }, id: 'map-update', name: 'Build Update Payload', type: 'n8n-nodes-base.code', typeVersion: 2, position: [600, 100] },
      { parameters: { method: 'PATCH', url: backendUrl('/api/video-ops/internal/content-ideas/{{ $json.ideaId }}'), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: SECRET }] }, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.patch) }}', options: {} }, id: 'update-row', name: 'Backend Update Content Idea', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [840, 100] },
      { parameters: { respondWith: 'json', responseBody: "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackStatus: $('Build Update Payload').item.json.patch.shotstack_status } }}", options: { responseCode: 200 } }, id: 'respond', name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [1080, 100] },
      { parameters: { method: 'POST', url: backendUrl("/api/video-ops/workflow-runs/{{ $('Set Input').item.json.workflowRunId }}/complete"), sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Callback-Secret', value: '={{ $env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ status: $('Build Update Payload').item.json.callbackStatus, message: $('Build Update Payload').item.json.callbackMessage, responsePayload: JSON.stringify({ contentIdeaId: $('Set Input').item.json.contentIdeaId, shotstackStatus: $('Build Update Payload').item.json.patch.shotstack_status }) }) }}", options: {} }, id: 'callback', name: 'Callback Backend', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [1320, 100] },
      { parameters: { respondWith: 'json', responseBody: "={{ { ok: true, contentIdeaId: $('Set Input').item.json.contentIdeaId, skipped: true, reason: $('Validate Render State').item.json.reason } }}", options: { responseCode: 200 } }, id: 'respond-skip', name: 'Respond Skipped', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [360, 300] },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Set Input', type: 'main', index: 0 }]] },
      'Set Input': { main: [[{ node: 'Backend Get Content Idea', type: 'main', index: 0 }]] },
      'Backend Get Content Idea': { main: [[{ node: 'Validate Render State', type: 'main', index: 0 }]] },
      'Validate Render State': { main: [[{ node: 'Skip if not pending', type: 'main', index: 0 }]] },
      'Skip if not pending': { main: [[{ node: 'Respond Skipped', type: 'main', index: 0 }], [{ node: 'Backend Get Shotstack Status', type: 'main', index: 0 }]] },
      'Backend Get Shotstack Status': { main: [[{ node: 'Build Update Payload', type: 'main', index: 0 }]] },
      'Build Update Payload': { main: [[{ node: 'Backend Update Content Idea', type: 'main', index: 0 }]] },
      'Backend Update Content Idea': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
      'Respond to Webhook': { main: [[{ node: 'Callback Backend', type: 'main', index: 0 }]] },
      'Callback Backend': { main: [] },
    },
    pinData: {}, meta: { templateCredsSetupCompleted: true }
  }
});

// 5. init-publish-tiktok-fixed
WORKFLOWS.push({
  name: 'init-publish-tiktok-fixed',
  filename: 'init-publish-tiktok-fixed.json',
  webhook: 'init-publish-tiktok',
  def: {
    name: 'init-publish-tiktok-fixed',
    nodes: [
      { parameters: { httpMethod: 'POST', path: 'init-publish-tiktok', responseMode: 'responseNode', options: {} }, id: 'webhook', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: [0, 0] },
      { parameters: { assignments: { assignments: [ { name: 'contentIdeaId', value: '={{ Number($json.body.contentIdeaId || $json.contentIdeaId || 0) }}', type: 'number' }, { name: 'workflowRunId', value: '={{ Number($json.body.workflowRunId || $json.workflowRunId || 0) }}', type: 'number' } ] }, options: {} }, id: 'set-input', name: 'Set Input', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [240, 0] },
      { parameters: { method: 'POST', url: "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/tiktok/init-publish-context' }}", sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: '={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ { contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0) } }}", options: {} }, id: 'context', name: 'HTTP Request Init Publish Context', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [480, 0] },
      { parameters: { method: 'HEAD', url: "={{ $('HTTP Request Init Publish Context').item.json.shotstackUrl }}", options: { response: { response: { fullResponse: true } } } }, id: 'video-head', name: 'HTTP Request Video Head', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [720, 0] },
      { parameters: { method: 'POST', url: 'https://open.tiktokapis.com/v2/post/publish/video/init/', sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json; charset=UTF-8' }, { name: 'Authorization', value: "={{ 'Bearer ' + $('HTTP Request Init Publish Context').item.json.accessToken }}" }] }, sendBody: true, contentType: 'raw', rawContentType: 'application/json; charset=UTF-8', body: "={{ JSON.stringify({ post_info: { title: String($('HTTP Request Init Publish Context').item.json.title || '').trim().slice(0, 150), privacy_level: $('HTTP Request Init Publish Context').item.json.selectedPrivacyLevel || 'SELF_ONLY', disable_duet: true, disable_comment: false, disable_stitch: true, video_cover_timestamp_ms: 1000 }, source_info: { source: 'FILE_UPLOAD', video_size: Number($('HTTP Request Video Head').item.json.headers['content-length'] || 0), chunk_size: Number($('HTTP Request Video Head').item.json.headers['content-length'] || 0), total_chunk_count: 1 } }) }}", options: {} }, id: 'init-publish', name: 'HTTP Request Init Publish', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [960, 0] },
      { parameters: { method: 'PATCH', url: "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/content-ideas/' + $('HTTP Request Init Publish Context').item.json.contentIdeaId }}", sendHeaders: true, headerParameters: { parameters: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Video-Ops-Internal-Secret', value: '={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}' }] }, sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ tiktok_publish_id: $json.data?.publish_id, tiktok_upload_url: $json.data?.upload_url, tiktok_upload_status: 'init_done', publish_status: 'draft' }) }}", options: {} }, id: 'update-idea', name: 'Backend Update Content Idea', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4, position: [1200, 0] },
      { parameters: { jsCode: callbackCode("$('Set Input').item.json.workflowRunId", "'SUCCEEDED'", 'Init publish TikTok termine.', "{ contentIdeaId: Number($('HTTP Request Init Publish Context').item.json.contentIdeaId || 0), publishId: $('HTTP Request Init Publish').item.json.data?.publish_id || '', uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || '' }") }, id: 'callback', name: 'Callback Success', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1440, 0] },
      { parameters: { respondWith: 'json', responseBody: "={{ { ok: true, contentIdeaId: $('HTTP Request Init Publish Context').item.json.contentIdeaId, publishId: $('HTTP Request Init Publish').item.json.data?.publish_id || '', uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || '', status: 'init_done' } }}", options: { responseCode: 200 } }, id: 'respond', name: 'Respond to Webhook', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: [1680, 0] },
    ],
    connections: {
      'Webhook': { main: [[{ node: 'Set Input', type: 'main', index: 0 }]] },
      'Set Input': { main: [[{ node: 'HTTP Request Init Publish Context', type: 'main', index: 0 }]] },
      'HTTP Request Init Publish Context': { main: [[{ node: 'HTTP Request Video Head', type: 'main', index: 0 }]] },
      'HTTP Request Video Head': { main: [[{ node: 'HTTP Request Init Publish', type: 'main', index: 0 }]] },
      'HTTP Request Init Publish': { main: [[{ node: 'Backend Update Content Idea', type: 'main', index: 0 }]] },
      'Backend Update Content Idea': { main: [[{ node: 'Callback Success', type: 'main', index: 0 }]] },
      'Callback Success': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] },
    },
    pinData: {}, meta: { templateCredsSetupCompleted: true }
  }
});

// ── Save JSON files ───────────────────────────────────────────────
const DIR = path.join(__dirname);
for (const wf of WORKFLOWS) {
  const fp = path.join(DIR, wf.filename);
  fs.writeFileSync(fp, JSON.stringify(wf.def, null, 2), 'utf-8');
  console.log(`✓ Saved ${wf.filename} (${fs.statSync(fp).size} bytes)`);
}

// ── n8n API: delete existing, import new, activate ───────────────
async function main() {
  console.log('\n── Fetching existing workflows from n8n ──');
  const list = await req('GET', `${N8N_BASE}/api/v1/workflows?limit=50`);
  if (list.status !== 200) {
    console.error('Cannot list workflows:', list.status, list.body);
    process.exit(1);
  }

  const existing = list.body.data || [];
  const NAMES_TO_DELETE = WORKFLOWS.map(w => w.def.name);

  for (const wf of existing) {
    if (NAMES_TO_DELETE.includes(wf.name)) {
      // deactivate first
      if (wf.active) {
        await req('PATCH', `${N8N_BASE}/api/v1/workflows/${wf.id}`, { active: false });
      }
      const del = await req('DELETE', `${N8N_BASE}/api/v1/workflows/${wf.id}`);
      console.log(`  Deleted "${wf.name}" (${wf.id}) → ${del.status}`);
    }
  }

  console.log('\n── Importing corrected workflows ──');
  const created = [];
  for (const wf of WORKFLOWS) {
    const res = await req('POST', `${N8N_BASE}/api/v1/workflows`, wf.def);
    if (res.status !== 200 && res.status !== 201) {
      console.error(`  FAILED to import "${wf.def.name}": ${res.status}`, JSON.stringify(res.body).slice(0, 300));
      continue;
    }
    const newId = res.body.id;
    console.log(`  Created "${wf.def.name}" id=${newId}`);
    created.push({ ...wf, id: newId });
  }

  console.log('\n── Activating workflows ──');
  for (const wf of created) {
    const res = await req('PATCH', `${N8N_BASE}/api/v1/workflows/${wf.id}`, { active: true });
    const active = res.body.active;
    console.log(`  "${wf.def.name}" active=${active} → ${res.status}`);
  }

  console.log('\n── Quick smoke test: webhook endpoints ──');
  for (const wf of created) {
    try {
      const testRes = await req('POST', `${N8N_BASE}/webhook/${wf.webhook}`, { _ping: true });
      console.log(`  ${wf.webhook} → ${testRes.status}`);
    } catch (e) {
      console.log(`  ${wf.webhook} → ERROR: ${e.message}`);
    }
  }

  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); });

const fs = require('fs');

const paths = {
  creationLive: 'c:/TikTok_App/n8n-local/creation-live.json',
  creationDoc: 'c:/TikTok_App/docs/n8n-workflows/creation-ideas.json',
  scriptLive: 'c:/TikTok_App/n8n-local/script-live.json',
  scriptDoc: 'c:/TikTok_App/docs/n8n-workflows/script-generation-single-llm.json',
  renderLive: 'c:/TikTok_App/n8n-local/render-live.json',
  renderDoc: 'c:/TikTok_App/docs/n8n-workflows/render-template-video-with-callback.json',
  initLive: 'c:/TikTok_App/n8n-local/init-live.json',
  initDoc: 'c:/TikTok_App/docs/n8n-workflows/init-publish-tiktok-fixed-migrated.json',
};

function readWorkflow(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  return { isArray: Array.isArray(data), data: Array.isArray(data) ? data[0] : data };
}

function writeWorkflow(path, wrapper) {
  const payload = wrapper.isArray ? [wrapper.data] : wrapper.data;
  fs.writeFileSync(path, JSON.stringify(payload, null, 2));
}

function headerParameters(pairs) {
  return { parameters: pairs.map(([name, value]) => ({ name, value })) };
}

function setSignedCallbackNode(node, position) {
  node.parameters = {
    jsCode: '',
  };
  node.type = 'n8n-nodes-base.code';
  node.typeVersion = 2;
  node.position = position;
}

function removeNode(workflow, name) {
  workflow.nodes = workflow.nodes.filter((node) => node.name !== name);
  delete workflow.connections[name];
}

function redirect(workflow, from, to) {
  workflow.connections[from] = { main: [[{ node: to, type: 'main', index: 0 }]] };
}

function clearOutgoing(workflow, from) {
  workflow.connections[from] = { main: [] };
}

function firstConnectionKey(workflow, candidates) {
  return candidates.find((name) => workflow.connections[name] || workflow.nodes.some((node) => node.name === name));
}

function legacyCallbackCode(message, payloadExpression, workflowRunExpression = '$json.workflowRunId || 0') {
  return `const http = require('http');
const https = require('https');
const { URL } = require('url');
const baseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '');
const callbackSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || '');
const workflowRunId = Number(${workflowRunExpression});
if (!baseUrl) throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');
if (!callbackSecret) throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET manquante');
if (!workflowRunId) throw new Error('workflowRunId manquant');
const body = JSON.stringify({
  status: 'SUCCEEDED',
  message: ${JSON.stringify(message)},
  responsePayload: JSON.stringify(${payloadExpression}),
});
const url = new URL(baseUrl + '/api/video-ops/workflow-runs/' + workflowRunId + '/complete');
const client = url.protocol === 'https:' ? https : http;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let response = null;
let lastError = null;
for (let attempt = 1; attempt <= 6; attempt += 1) {
  try {
    response = await new Promise((resolve, reject) => {
      const req = client.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Video-Ops-Callback-Secret': callbackSecret,
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      break;
    }
    lastError = 'Callback backend refuse: ' + response.statusCode + ' ' + response.body;
    if (response.statusCode !== 404 || attempt === 6) {
      throw new Error(lastError);
    }
  } catch (error) {
    lastError = error.message || String(error);
    if (attempt === 6) {
      throw error;
    }
  }
  await sleep(500 * attempt);
}
if (!response || response.statusCode < 200 || response.statusCode >= 300) {
  throw new Error(lastError || 'Callback backend refuse.');
}
return [{ json: { ...$json, callbackStatusCode: response.statusCode } }];`;
}

function patchCreation(path) {
  const wrapper = readWorkflow(path);
  const wf = wrapper.data;
  const callback = wf.nodes.find((n) => n.name === 'Callback Success');
  const respond = wf.nodes.find((n) => n.name === 'Respond to Webhook');
  const createRowName = firstConnectionKey(wf, ['HTTP Request Create Row', 'Supabase Create Row']);
  setSignedCallbackNode(callback, [860, 120]);
  callback.parameters.jsCode = legacyCallbackCode('Creation ideas terminee.', '{ createdCount: Number($json.createdCount || 0) }', "$('Summarize').item.json.workflowRunId || 0");
  respond.parameters.responseBody = "={{ { ok: true, workflowRunId: $('Summarize').item.json.workflowRunId, createdCount: $('Summarize').item.json.createdCount, status: 'idea_created' } }}";
  removeNode(wf, 'Build Callback Auth');
  if (createRowName && createRowName !== 'HTTP Request Create Row') {
    redirect(wf, 'Normalize Topic', createRowName);
    redirect(wf, createRowName, 'Summarize');
  }
  redirect(wf, 'Summarize', 'Respond to Webhook');
  redirect(wf, 'Respond to Webhook', 'Callback Success');
  clearOutgoing(wf, 'Callback Success');
  writeWorkflow(path, wrapper);
}

function patchScript(path) {
  const wrapper = readWorkflow(path);
  const wf = wrapper.data;
  const callback = wf.nodes.find((n) => n.name === 'Callback Success');
  const updateName = firstConnectionKey(wf, ['HTTP Request Update', 'Supabase Update']);
  setSignedCallbackNode(callback, [760, 120]);
  callback.parameters.jsCode = legacyCallbackCode('Script workflow termine.', "{ contentIdeaId: Number($('Parse JSON').item.json.contentIdeaId || 0) }", "$('Parse JSON').item.json.workflowRunId || 0");
  removeNode(wf, 'Build Callback Auth');
  if (updateName) {
    redirect(wf, 'Parse JSON', updateName);
    redirect(updateName ? wf : wf, updateName, 'Respond to Webhook');
  }
  redirect(wf, 'Respond to Webhook', 'Callback Success');
  clearOutgoing(wf, 'Callback Success');
  writeWorkflow(path, wrapper);
}

function patchRender(path) {
  const wrapper = readWorkflow(path);
  const wf = wrapper.data;
  const callback = wf.nodes.find((n) => n.name === 'Callback Success');
  const preparingName = firstConnectionKey(wf, ['HTTP Request Update Preparing', 'Supabase Update Preparing']);
  const renderIdName = firstConnectionKey(wf, ['HTTP Request Update Render Id', 'Supabase Update Render Id']);
  const shotstackRender = wf.nodes.find((n) => n.name === 'HTTP Request Shotstack Render');
  const pexels = wf.nodes.find((n) => n.name === 'HTTP Request Pexels');
  const selectMedia = wf.nodes.find((n) => n.name === 'Select Portrait Media');
  setSignedCallbackNode(callback, [1180, 100]);
  callback.parameters.jsCode = legacyCallbackCode('Render Shotstack demande.', "{ contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0), shotstackRenderId: $('HTTP Request Shotstack Render').item.json.response?.id || $('HTTP Request Shotstack Render').item.json.id || '' }", "$('Set Input').item.json.workflowRunId || 0");
  if (pexels) {
    pexels.parameters.url = "={{ (() => { const raw = String($('Set Input').item.json.keyword || $('Set Input').item.json.topic || 'business'); const normalized = raw.replace(/[\"'&]/g, ' ').replace(/[^\\w\\s-]/g, ' ').replace(/\\s+/g, ' ').trim(); const query = (normalized || 'business').split(' ').slice(0, 4).join(' ') || 'business'; return 'https://api.pexels.com/videos/search?query=' + encodeURIComponent(query) + '&per_page=5&orientation=portrait'; })() }}";
  }
  if (selectMedia) {
    selectMedia.parameters.jsCode = "const videos = $json.videos || [];\nif (!videos.length) {\n  throw new Error('Aucune video Pexels retournee');\n}\nconst preferred = [];\nconst fallback = [];\nfor (const video of videos) {\n  for (const file of video.video_files || []) {\n    if (!file?.link || file.file_type !== 'video/mp4') continue;\n    const width = Number(file.width || video.width || 0);\n    const height = Number(file.height || video.height || 0);\n    if (!width || !height || height <= width) continue;\n    const item = { link: file.link, width, height };\n    if ((width === 1080 && height === 1920) || (width === 720 && height === 1280) || (width === 540 && height === 960)) {\n      preferred.push(item);\n    } else {\n      fallback.push(item);\n    }\n  }\n}\nconst pick = (preferred[0] || fallback.sort((a, b) => (b.height * b.width) - (a.height * a.width))[0]);\nif (!pick) {\n  throw new Error('Aucune video portrait exploitable retournee par Pexels');\n}\nreturn [{ json: {\n  id: $('Set Input').item.json.contentIdeaId,\n  workflowRunId: $('Set Input').item.json.workflowRunId,\n  topic: $('Set Input').item.json.topic,\n  scripts: $('Set Input').item.json.script,\n  caption: $('Set Input').item.json.caption,\n  image_prompt: String($('HTTP Request Image Prompt').item.json.choices?.[0]?.message?.content || '').trim(),\n  background_video_url: pick.link\n}}];";
  }
  if (shotstackRender) {
    shotstackRender.parameters.url = "={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\\/+$/, '') + '/api/video-ops/internal/shotstack/render' }}";
    shotstackRender.parameters.headerParameters = {
      parameters: [
        ['Content-Type', 'application/json'],
        ['X-Video-Ops-Internal-Secret', "={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}"],
      ].map(([name, value]) => ({ name, value })),
    };
    shotstackRender.parameters.jsonBody = "={{ JSON.stringify((() => { const cleanText = (value) => String(value || '').normalize('NFKD').replace(/[^\\x20-\\x7E]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 120); const lines = String($json.scripts || '').split('\\n').map((line) => cleanText(line)).filter(Boolean); const fallbackTopic = cleanText($('Set Input').item.json.topic || 'Video business'); const textLines = (lines.length ? lines : [fallbackTopic]).slice(0, 3); const titleClips = textLines.filter(Boolean).map((line, index) => ({ asset: { type: 'title', text: line, style: 'minimal', color: '#ffffff', background: 'rgba(15,15,15,0.55)' }, start: index * 3, length: 3, position: 'center' })); return { timeline: { background: '#0f0f0f', tracks: [ { clips: [ { asset: { type: 'video', src: $json.background_video_url }, start: 0, length: 15, fit: 'cover' } ] }, ...(titleClips.length ? [{ clips: titleClips }] : []) ] }, output: { format: 'mp4', aspectRatio: '9:16', resolution: 'hd' } }; })()) }}";
  }
  removeNode(wf, 'Build Callback Auth');
  if (preparingName) {
    redirect(wf, 'Select Portrait Media', preparingName);
    redirect(wf, preparingName, 'HTTP Request Shotstack Render');
  }
  if (renderIdName) {
    redirect(wf, 'HTTP Request Shotstack Render', renderIdName);
    redirect(wf, renderIdName, 'Respond to Webhook');
  }
  redirect(wf, 'Respond to Webhook', 'Callback Success');
  clearOutgoing(wf, 'Callback Success');
  writeWorkflow(path, wrapper);
}

function patchInit(path) {
  const wrapper = readWorkflow(path);
  const wf = wrapper.data;
  const callback = wf.nodes.find((n) => n.name === 'Callback Success');
  const updateName = firstConnectionKey(wf, ['Supabase Update Content Idea', 'HTTP Request Update Content Idea']);
  const accountContext = wf.nodes.find((n) => n.name === 'HTTP Request Account Context');
  const initPublish = wf.nodes.find((n) => n.name === 'HTTP Request Init Publish');
  setSignedCallbackNode(callback, [980, 120]);
  callback.parameters.jsCode = legacyCallbackCode('Init publish TikTok termine.', "{ contentIdeaId: $('Supabase Get Content Idea').item.json[0].id, uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || '' }", "$('Set Input').item.json.workflowRunId || 0");
  if (accountContext) {
    const target = accountContext.parameters?.bodyParameters?.parameters?.find((entry) => entry.name === 'tiktokAccountOpenId');
    if (target) {
      target.value = "={{ $('Supabase Get Content Idea').item.json[0].tiktok_account_open_id }}";
    }
  }
  if (initPublish) {
    const contentIdeaId = initPublish.parameters?.bodyParameters?.parameters?.find((entry) => entry.name === 'contentIdeaId');
    if (contentIdeaId) {
      contentIdeaId.value = "={{ $('Set Input').item.json.contentIdeaId }}";
    }
  }
  removeNode(wf, 'Build Callback Auth');
  if (updateName) {
    redirect(wf, 'HTTP Request Init Publish', updateName);
    redirect(wf, updateName, 'Respond to Webhook');
  }
  redirect(wf, 'Respond to Webhook', 'Callback Success');
  clearOutgoing(wf, 'Callback Success');
  writeWorkflow(path, wrapper);
}

patchCreation(paths.creationLive);
patchCreation(paths.creationDoc);
patchScript(paths.scriptLive);
patchScript(paths.scriptDoc);
patchRender(paths.renderLive);
patchRender(paths.renderDoc);
patchInit(paths.initLive);
patchInit(paths.initDoc);
console.log('patched workflows');

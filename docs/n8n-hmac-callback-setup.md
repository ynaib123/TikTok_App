# n8n HMAC Callback Setup

Ce guide remplace progressivement le header legacy `X-Video-Ops-Callback-Secret` par une signature HMAC.

## Variables a definir

Cote backend:

```properties
APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET=<secret-long-et-random>
APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true
```

Cote n8n:

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

Quand les 4 workflows webhook seront migres et testes:

```properties
APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=false
```

## Principe

Le backend attend:

- `X-Video-Ops-Callback-Timestamp`
- `X-Video-Ops-Callback-Signature`

Signature calculee sur cette chaine canonique:

```text
POST
/api/video-ops/workflow-runs/<workflowRunId>/complete
<timestamp ISO UTC>
<base64 sha256 du body brut>
```

Puis:

```text
signature = base64(hmac_sha256(secret, canonical))
```

## Pattern recommande dans n8n

Pour chaque workflow webhook:

1. Garder le node `Callback Success` de type `HTTP Request`
2. Avant lui, ajouter un node `Code` nomme `Build Callback Auth`
3. Le `Code` produit:
   - `callbackUrl`
   - `callbackTimestamp`
   - `callbackSignature`
   - `callbackBody`
4. Le node `Callback Success` lit ces 4 champs

## Code node standard

Node `Code` nomme `Build Callback Auth`:

```javascript
const crypto = require('crypto');

const backendBaseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '');
const hmacSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET || '');
const workflowRunId = Number($json.workflowRunId || $('Set Input').item.json.workflowRunId || 0);

if (!backendBaseUrl) {
  throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');
}

if (!hmacSecret) {
  throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET manquante');
}

if (!workflowRunId) {
  throw new Error('workflowRunId manquant pour le callback');
}

const requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;
const callbackUrl = `${backendBaseUrl}${requestPath}`;
const callbackTimestamp = new Date().toISOString();
const callbackBodyObject = {
  status: 'SUCCEEDED',
  message: 'Workflow termine avec succes.',
  responsePayload: JSON.stringify({
    workflowRunId,
  }),
};
const callbackBody = JSON.stringify(callbackBodyObject);
const payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');
const canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\n');
const callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');

return [{
  json: {
    ...$json,
    callbackUrl,
    callbackTimestamp,
    callbackSignature,
    callbackBody,
  }
}];
```

## Callback Success node

Config commune:

- Method: `POST`
- URL:

```text
={{ $json.callbackUrl }}
```

- Headers:

```text
Content-Type: application/json
X-Video-Ops-Callback-Timestamp: {{ $json.callbackTimestamp }}
X-Video-Ops-Callback-Signature: {{ $json.callbackSignature }}
```

- Body Content Type: `RAW`
- Raw Content Type: `application/json`
- Body:

```text
={{ $json.callbackBody }}
```

## Workflow par workflow

### 1. init-publish-tiktok-fixed

Branchement:

- `Supabase Update Content Idea` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Dans `Build Callback Auth`, garde comme source de `workflowRunId`:

```javascript
Number($('Set Input').item.json.workflowRunId || 0)
```

Dans `callbackBodyObject`, tu peux enrichir:

```javascript
responsePayload: JSON.stringify({
  contentIdeaId: $('Supabase Get Content Idea').item.json.id,
  uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || ''
})
```

### 2. script-generation-single-llm

Branchement:

- `Supabase Update Script` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Source `workflowRunId`:

```javascript
Number($json.workflowRunId || 0)
```

### 3. render-template-video-with-callback

Branchement:

- `Supabase Update Shotstack Request` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Source `workflowRunId`:

```javascript
Number($('Set Input').item.json.workflowRunId || 0)
```

### 4. creation-ideas

Branchement:

- `Finalize Count` -> `Build Callback Auth` -> `Callback Success` -> `Respond to Webhook`

Source `workflowRunId`:

```javascript
Number($json.workflowRunId || 0)
```

## Strategie de migration

1. Migrer `init-publish-tiktok-fixed`
2. Tester depuis le front
3. Migrer `script-generation-single-llm`
4. Migrer `render-template-video-with-callback`
5. Migrer `creation-ideas`
6. Laisser `APP_VIDEO_OPS_ALLOW_LEGACY_WORKFLOW_CALLBACK_SECRET=true` pendant les tests
7. Quand tout est vert, passer a `false`

## Verification rapide

Quand un callback HMAC passe:

- le node `Callback Success` est vert
- le backend repond `200`
- `video_workflow_runs.status = SUCCEEDED`
- le front n attend plus longtemps qu avant

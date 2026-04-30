# Patch exact pour `init-publish-tiktok` dans ton instance `n8n`

Source de depart:

- workflow reel dans [templaten8n.txt](/c:/TikTok_App/docs/n8n-workflows/templaten8n.txt)

Objectif:

- garder la logique actuelle
- supprimer les secrets et URL backend hardcodes
- reposer sur les variables `n8n`

## Variables `n8n` requises

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## Nodes a modifier

Tu n as besoin de modifier que 2 nodes:

1. `HTTP Request Init Publish Context`
2. `Build Callback Auth`

Le reste peut rester tel quel.

## 1. Node `HTTP Request Init Publish Context`

### Champ `URL`

Remplace:

```text
https://endurable-defiling-bleak.ngrok-free.dev/api/video-ops/internal/tiktok/init-publish-context
```

Par:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/tiktok/init-publish-context' }}
```

### Header `X-Video-Ops-Internal-Secret`

Remplace:

```text
video-ops-internal-2026-very-secret-1
```

Par:

```text
={{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

### Champ `JSON Body`

Tu peux garder ton body actuel, ou le normaliser comme ceci:

```json
={{ { contentIdeaId: Number($('Set Input').item.json.contentIdeaId || 0) } }}
```

## 2. Node `Build Callback Auth`

Remplace tout le contenu `jsCode` actuel par ceci:

```javascript
const crypto = require('crypto');

const backendBaseUrl = String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '');
const hmacSecret = String($env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET || '');
const workflowRunId = Number($('Set Input').item.json.workflowRunId || 0);

if (!backendBaseUrl) {
  throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL manquante');
}

if (!hmacSecret) {
  throw new Error('APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET manquante');
}

if (!workflowRunId) {
  throw new Error('workflowRunId manquant');
}

const requestPath = `/api/video-ops/workflow-runs/${workflowRunId}/complete`;
const callbackUrl = `${backendBaseUrl}${requestPath}`;
const callbackTimestamp = new Date().toISOString();

const callbackBodyObject = {
  status: 'SUCCEEDED',
  message: 'Init publish TikTok termine.',
  responsePayload: JSON.stringify({
    contentIdeaId: $('Supabase Get Content Idea').item.json.id,
    uploadUrl: $('HTTP Request Init Publish').item.json.data?.upload_url || '',
  }),
};

const callbackBody = JSON.stringify(callbackBodyObject);
const payloadHash = crypto.createHash('sha256').update(callbackBody, 'utf8').digest('base64');
const canonical = ['POST', requestPath, callbackTimestamp, payloadHash].join('\n');
const callbackSignature = crypto.createHmac('sha256', hmacSecret).update(canonical, 'utf8').digest('base64');

return [{
  json: {
    callbackUrl,
    callbackTimestamp,
    callbackSignature,
    callbackBody,
  }
}];
```

## 3. Node `Callback Success`

La config est deja presque bonne. Verifie juste ces valeurs:

### URL

```text
={{ $json.callbackUrl }}
```

### Headers

```text
Content-Type: application/json
X-Video-Ops-Callback-Timestamp: {{ $json.callbackTimestamp }}
X-Video-Ops-Callback-Signature: {{ $json.callbackSignature }}
```

### Body

```text
={{ $json.callbackBody }}
```

Note:

dans ton export actuel, le champ URL contient une fin de ligne parasite:

```text
={{ $json.callbackUrl }}\n
```

Le plus propre est de le remettre exactement a:

```text
={{ $json.callbackUrl }}
```

## 4. Ce que tu peux verifier juste apres

Quand tu relances `init-publish-tiktok`:

- le node `HTTP Request Init Publish Context` repond `200`
- le node `Build Callback Auth` ne leve pas d erreur sur les variables manquantes
- le node `Callback Success` repond `200`
- le backend marque le `workflowRunId` en `SUCCEEDED`

## 5. Resultat attendu

Apres ce patch:

- plus d URL backend `ngrok` hardcodee dans le workflow
- plus de secret interne hardcode
- plus de secret HMAC hardcode
- la logique `init-publish` reste identique

## 6. Etape suivante recommandee

Une fois `init-publish-tiktok` corrige dans ton instance `n8n`, applique le meme principe aux autres workflows:

- `script-generation`
- `creation-ideas`
- `render-template-video`
- `check-shotstack-status`

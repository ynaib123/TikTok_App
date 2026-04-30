# Migration vers le mode le plus securise

Objectif:

- `Accounts` stocke les credentials et cles API
- `n8n` n appelle plus directement Groq, Pexels, Shotstack
- `n8n` appelle seulement le backend
- le backend appelle lui-meme Groq, Pexels, Shotstack et Supabase

## Ce qui est maintenant en place dans le repo

Backend:

- `POST /api/video-ops/internal/groq/chat-completions`
- `POST /api/video-ops/internal/pexels/videos/search`
- `POST /api/video-ops/internal/shotstack/render`
- `GET /api/video-ops/internal/shotstack/render/{renderId}`

Le backend:

- verifie `X-Video-Ops-Internal-Secret`
- lit les credentials depuis `service_connections`
- dechiffre les secrets stockes
- appelle l API externe a la place de `n8n`

Supabase:

- le backend sait maintenant utiliser la connexion `SUPABASE` de `Accounts` si elle est configuree
- sinon il garde le fallback vers les variables backend existantes

## Ce que `Accounts` doit contenir

### Supabase

- `baseUrl`: URL projet Supabase
- `secretValue`: service role key

### Groq

- `baseUrl`: `https://api.groq.com`
- `secretValue`: API key Groq

### Pexels

- `baseUrl`: `https://api.pexels.com`
- `secretValue`: API key Pexels

### Shotstack

- `baseUrl`: `https://api.shotstack.io`
- `secretValue`: API key Shotstack

## Ce que `n8n` doit encore garder

En mode cible, `n8n` n a plus besoin des cles externes de:

- Groq
- Pexels
- Shotstack
- Supabase service role key

`n8n` garde seulement:

- `APP_VIDEO_OPS_BACKEND_BASE_URL`
- `APP_VIDEO_OPS_INTERNAL_API_SECRET`
- `APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET`

## Remplacements a faire dans les workflows

### 1. Script generation

Avant:

- `HTTP Request` vers `https://api.groq.com/openai/v1/chat/completions`
- header `Authorization: Bearer <GROQ_API_KEY>`

Apres:

- `HTTP Request` vers:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/groq/chat-completions' }}
```

- headers:

```text
Content-Type: application/json
X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

- body:

le meme JSON que celui envoye a Groq aujourd hui

### 2. Creation ideas

Avant:

- `HTTP Request` direct Groq

Apres:

- meme remplacement que pour `script-generation`

### 3. Render template video

Avant:

- `HTTP Request` direct Groq
- `HTTP Request` direct Pexels
- `HTTP Request` direct Shotstack

Apres:

- Groq:

```text
POST /api/video-ops/internal/groq/chat-completions
```

- Pexels:

```text
POST /api/video-ops/internal/pexels/videos/search
```

Body exemple:

```json
{
  "query": "fitness",
  "perPage": 5,
  "orientation": "portrait"
}
```

- Shotstack render:

```text
POST /api/video-ops/internal/shotstack/render
```

avec le meme body JSON que l appel Shotstack actuel

### 4. Check shotstack status

Avant:

- `GET https://api.shotstack.io/v1/render/<renderId>`

Apres:

- `GET` vers:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/shotstack/render/' + $json.shotstack_render_id }}
```

- header:

```text
X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

## Ordre recommande

1. `init-publish-tiktok`
2. `script-generation`
3. `creation-ideas`
4. `render-template-video`
5. `check-shotstack-status`

## Benefice final

Quand cette migration est terminee:

- `n8n` ne stocke plus les cles API tierces
- `Accounts` devient la source de verite des credentials
- la rotation des credentials se fait cote backoffice
- les exports JSON `n8n` ne contiennent plus de secrets externes

# n8n TikTok Account Context

Ce guide sert pour les prochains workflows `n8n` qui ont encore besoin d un `access_token` TikTok ou d un `creator_info` a jour.

Objectif:

- ne plus lire `refresh_token` ou `access_token` depuis `tiktok_accounts` dans `n8n`
- deleguer le refresh token et la lecture optionnelle de `creator_info` au backend
- garder les secrets TikTok seulement dans le backend

## Endpoint backend a utiliser

`POST /api/video-ops/internal/tiktok/account-context`

Header obligatoire:

```text
X-Video-Ops-Internal-Secret: <APP_VIDEO_OPS_INTERNAL_API_SECRET>
```

Body minimal:

```json
{
  "tiktokAccountOpenId": "open-id-demo"
}
```

Body avec `creator_info`:

```json
{
  "tiktokAccountOpenId": "open-id-demo",
  "includeCreatorInfo": true
}
```

Reponse:

```json
{
  "tiktokAccountOpenId": "open-id-demo",
  "accessToken": "access-token-temporaire",
  "tokenType": "Bearer",
  "scope": "user.info.basic,video.publish",
  "privacyLevelOptions": ["SELF_ONLY", "PUBLIC_TO_EVERYONE"],
  "selectedPrivacyLevel": "SELF_ONLY"
}
```

## Quand l utiliser

Utilise cet endpoint quand un workflow `n8n` doit:

- appeler une API TikTok avec un `Authorization: Bearer ...`
- connaitre les `privacy_level_options`
- choisir un niveau de privacy avant une action TikTok

Ne l utilise pas pour:

- relire la liste des comptes depuis le backoffice
- reconnecter un compte TikTok
- preparer l `upload_url` de `init-publish`, qui a deja son endpoint dedie `internal/tiktok/init-publish-context`

## Pattern recommande dans n8n

1. Le workflow recoit `tiktokAccountOpenId`
2. Il appelle `POST /api/video-ops/internal/tiktok/account-context`
3. Il reutilise `accessToken` pour les appels TikTok suivants
4. Si besoin, il reutilise `selectedPrivacyLevel` ou `privacyLevelOptions`
5. Il ne lit plus `tiktok_accounts.refresh_token` ni `tiktok_accounts.access_token`

## Mapping n8n conseille

Dans un node `HTTP Request`:

- Method: `POST`
- URL:

```text
={{ String($env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '') + '/api/video-ops/internal/tiktok/account-context' }}
```

- Headers:

```text
Content-Type: application/json
X-Video-Ops-Internal-Secret: {{ $env.APP_VIDEO_OPS_INTERNAL_API_SECRET }}
```

- Body:

```json
={{
  {
    tiktokAccountOpenId: $json.tiktokAccountOpenId,
    includeCreatorInfo: true
  }
}}
```

Ensuite, pour un appel TikTok:

```text
Authorization: {{ $json.tokenType + ' ' + $json.accessToken }}
```

## Workflow exemple

Le repo contient une base prete a importer:

- [docs/n8n-workflows/tiktok-account-context-example.json](docs/n8n-workflows/tiktok-account-context-example.json)

Ce workflow:

- recoit `tiktokAccountOpenId`
- appelle le backend interne
- renvoie les champs utiles normalises pour la suite

## Migration type d un ancien workflow sensible

Avant:

- `Supabase Get TikTok Account`
- lecture de `refresh_token`
- appel `https://open.tiktokapis.com/v2/oauth/token/`
- parfois appel `creator_info`

Apres:

- suppression de `Supabase Get TikTok Account`
- suppression du refresh token dans `n8n`
- ajout d un appel `internal/tiktok/account-context`
- conservation des seuls appels TikTok metier utiles

## Checklist de validation

- `APP_VIDEO_OPS_INTERNAL_API_SECRET` est configure cote backend et cote `n8n`
- le workflow `n8n` ne lit plus `tiktok_accounts.access_token`
- le workflow `n8n` ne lit plus `tiktok_accounts.refresh_token`
- l appel backend interne repond `200`
- les appels TikTok suivants utilisent bien `accessToken` fourni par le backend

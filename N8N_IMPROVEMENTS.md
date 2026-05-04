# n8n TikTok Workflows - Robustness Improvements

## ✅ Améliorations Implémentées

### 1. **Error Handling Complet**

#### init-live.json
- Chaîne d'erreur globale : chaque étape peut échouer et envoyer un callback d'erreur au backend
- `Callback: Error (best effort)` — envoie un callback FAILED même en cas d'erreur
- `Respond: Error` — retourne HTTP 500 au caller

#### check-live.json
- Même pattern : erreur capturée, callback envoyé, réponse 500 retournée
- Les erreurs sur get-idea, validation, ou Shotstack sont toutes traitées

**Bénéfice:** Pas de hangs silencieux, le backend sait toujours si ça a échoué

---

### 2. **Retry + Exponential Backoff**

Tous les appels HTTP externes ont des options de retry intégrées :

```json
"options": {
  "retry": {
    "maxRetries": 3,
    "delayMultiplier": 2,
    "initialDelay": 1000
  },
  "timeout": 30000
}
```

**Délais appliqués :**
- 1ère tentative : immédiate
- 2ème tentative : 2s (2 × 1s × 2^1)
- 3ème tentative : 4s (2 × 1s × 2^2)
- 4ème tentative : 8s (2 × 1s × 2^3)

**Timeouts :**
- TikTok API: 45s (pour upload)
- Backend API: 20-30s
- Video HEAD check: 15s

---

### 3. **Validation Stricte des Inputs**

#### init-live.json — `Validate Input` (node: validate-input)
```javascript
- contentIdeaId > 0 (obligatoire)
- workflowRunId > 0 (obligatoire)
```

#### init-live.json — `Validate Init Context` (node: validate-context)
```javascript
- accessToken présent et non-vide
- title présent (max 150 chars)
- shotstackUrl présent
- selectedPrivacyLevel présent
```

#### init-live.json — `Validate Video Headers` (node: validate-video)
```javascript
- Taille vidéo > 0
- Taille vidéo ≤ 1GB
```

#### check-live.json — `Validate Render State` (node: validate-render)
```javascript
- contentIdea existe et a un ID
- Vérification que l'ID du payload correspond au contenu récupéré
- shotstack_render_id présent
- shotstack_status valide (queued|rendering|preparing|done|failed|timeout)
```

---

### 4. **Contrôle des États Pipeline**

#### init-live.json
- Chaque étape valide son input avant de continuer
- Response HTTP du TikTok est vérifiée avant extraction

#### check-live.json
- `Skip if not pending` : ignorer si déjà done/failed/timeout
- `Validate Render State` : rejeter les statuts invalides
- `Build Update Payload` : valider le statut Shotstack avant de builder le patch

**Bénéfice:** Pas d'exécution partielle, états cohérents

---

### 5. **Idempotence**

#### check-live.json — Vérification ID
```javascript
if (idea.id !== Number($('Validate Input').item.json.contentIdeaId)) {
  throw new Error('Mismatch: contentIdeaId does not match');
}
```
- Garantit que le contenu récupéré est bien celui demandé
- Prévient les updates sur le mauvais contenu en cas de concurrence

#### init-live.json — Pas de déduplication explicite
- **Pourquoi :** TikTok API retourne publish_id/upload_url même pour appels idempotents
- **Stratégie :** Backend check si tiktok_publish_id existe déjà avant d'appeler le workflow

#### check-live.json — Statut skip
- Si déjà done/failed, ne pas refaire la check
- Retour rapide avec skip=true

---

### 6. **Callbacks Robustes en Cas d'Échec**

#### init-live.json — `Callback: Error (best effort)`
```javascript
// Retry jusqu'à 2 fois avec backoff exponentiel
// Timeout 15s
// En cas d'échec final : log uniquement (ne pas interrompre)
```

#### check-live.json — `Callback: Error (best effort)`
- Même pattern : best effort
- Message d'erreur limité à 200 chars (titre) + 500 chars (détail)

#### init-live.json — `Callback: Success (with retry)`
```javascript
// Retry jusqu'à 3 fois avec backoff exponentiel
// Timeout 20s
// Validation que statusCode est 2xx
```

#### check-live.json — `Callback: Backend (with retry)`
- Retry jusqu'à 3 fois
- Validation du statut HTTP

**Bénéfice:** Le backend sait TOUJOURS si le workflow a réussi/échoué, même si la connexion est flaky

---

## 📋 Checklist de Validation

### Pour tester init-live:
- [ ] Appel avec contentIdeaId=0 → Error 400 (validation)
- [ ] Appel avec workflowRunId=0 → Error 400 (validation)
- [ ] Backend API down → Retry 3x + callback d'erreur
- [ ] TikTok API timeout → Retry 3x + callback d'erreur
- [ ] Video URL 404 → Error (validation)
- [ ] Video size = 0 → Error (validation)
- [ ] Video size > 1GB → Error (validation)
- [ ] Success path → Callback SUCCEEDED + Response 200

### Pour tester check-live:
- [ ] Appel avec contentIdeaId=0 → Error 400
- [ ] ContentIdea n'existe pas → Error
- [ ] ContentIdea exist mais mismatch ID → Error
- [ ] Pas de shotstack_render_id → Error
- [ ] Status = 'done' → Update + Callback + Skip next check
- [ ] Status = 'queued' → Continuer la check
- [ ] Status = 'failed' → Update + Callback FAILED
- [ ] Backend down → Retry 2x + error callback

---

## 🔧 Configuration Requise

Assurer que les env vars sont set sur le conteneur n8n:

```bash
N8N_ENCRYPTION_KEY=<key>
APP_VIDEO_OPS_BACKEND_BASE_URL=http://backend:8080
APP_VIDEO_OPS_INTERNAL_API_SECRET=<secret>
APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET=<secret>
APP_VIDEO_OPS_WORKFLOW_CALLBACK_HMAC_SECRET=<secret>
APP_VIDEO_OPS_TIKTOK_CLIENT_KEY=<key>
APP_VIDEO_OPS_TIKTOK_CLIENT_SECRET=<secret>
```

---

## 📊 Patterns Utilisés

### Error Handling
- **Fail-fast validation** : bloquer au plus tôt avec des messages clairs
- **Cascading error** : chaque nœud peut échouer → callback → response erreur
- **Best effort callbacks** : envoyer l'erreur même si la callback elle-même échoue (ignore silent failures)

### Retry
- **Exponential backoff** : délai augmente à chaque tentative
- **Jitter configuré** : `delayMultiplier: 2` = backoff aggressif
- **Timeout distinctes** : plus court pour les checks, plus long pour les uploads

### Idempotence
- **Input validation** : contentIdeaId/workflowRunId obligatoires
- **ID mismatch detection** : vérifier que les données correspondent
- **State gating** : skip si déjà terminé

---

## ⚠️ Limitations Connues

1. **Pas de deduplication au niveau TikTok** : Si le workflow est appelé 2× pour le même contentIdea, TikTok créera 2 publish_ids. Mitigation: Backend doit garder idempotency tokens et checker avant l'appel.

2. **Callback best effort** : L'erreur est loggée localement si le callback n'arrive pas. Mitigation: Implémenter un mécanisme de replay coté backend pour les callbacks perdus.

3. **Pas de rate limiting** : Si 100 workflows lancent en parallèle, aucune throttle. Mitigation: n8n peut être configuré avec des queues ou des limites de concurrence.

4. **Pas de circuit breaker** : Si TikTok API est down, tous les workflows vont retry. Mitigation: Ajouter un nœud qui détecte les pannes globales et skip les retries.

---

## 🚀 Déploiement

1. **Backup des workflows actuels** ✅ (déjà dans git)
2. **Tester en staging** : Déployer sur une branche de test
3. **Monitor les callbacks** : Vérifier que backend reçoit toutes les notifications
4. **Graduel rollout** : 10% → 50% → 100% de traffic

---

## 📝 Notes d'Implémentation

- Les nœuds avec suffixe "HTTP:" utilisent des timeouts et retry
- Les nœuds "Code" font la validation métier (pas juste les types)
- Les callbacks "best effort" ne bloquent pas le workflow principal
- Tous les messages d'erreur sont loggés avec le contentIdeaId pour traçabilité

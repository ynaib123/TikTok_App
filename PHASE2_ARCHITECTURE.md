# Phase 2 — Architecture & UX (Industrialisation)

**Durée estimée** : ~2 mois
**Prérequis** : Phase 1 complétée
**Objectif** : Découpage propre, design system, n8n maintenable, expérience admin polie.

---

## Livrable 2.1 — Splitter VideoOpsService (Backend)

**Effort** : 8h.

### À faire
Découper `VideoOpsService` (15 deps) en services à responsabilité unique :
- `VideoQueryService` — fetch ideas, statuses, pagination
- `VideoPublishService` — trigger workflows, upload TikTok, mark publish
- `VideoTrackingService` — record events, sync pipeline state (déjà existe en partie)
- `VideoDeletionService` — cascade delete (ideas, runs, events, pipeline state)
- `VideoDashboardService` — agrégation pour `/dashboard`

`VideoOpsService` devient une façade qui délègue, ou est supprimée et le controller appelle directement.

### Acceptance
- Aucune classe de domaine > 8 deps injectées
- Tous les tests existants passent
- Aucun changement de contrat HTTP (compatibilité totale)

---

## Livrable 2.2 — Splitter VideoOpsController (Backend)

**Effort** : 6h.

### À faire
Découper en controllers thématiques :
- `ContentIdeaController` — `/content-ideas/*`
- `WorkflowController` — `/workflows/*`, `/workflow-runs/*`
- `AccountsController` — `/accounts/*`, `/tiktok-accounts/*`
- `DashboardController` — `/dashboard`, `/observability`, `/health`
- `InternalProxyController` — `/internal/*`

### Acceptance
- Aucun controller > 15 endpoints
- Routes inchangées
- Tests d'intégration passent

---

## Livrable 2.3 — Sub-workflows n8n partagés (n8n)

**Effort** : 10h.

### À faire
Créer dans `Backend/tools/n8n-workflows/_shared/` :
- `_callback-with-hmac.json` — utility sub-workflow qui prend `{url, payload}` et fait l'appel callback avec retry HMAC + idempotency-key
- `_error-callback.json` — sub-workflow standardisé pour notifier l'échec
- `_retry-with-backoff.json` — wrapper retry exponentiel

Refactorer les 4 workflows pour appeler ces sub-workflows. Économie estimée : ~600 lignes JSON.

### Acceptance
- Aucune duplication de logique HMAC dans les workflows métier
- Tests fonctionnels manuels OK pour les 4 flux

---

## Livrable 2.4 — Idempotency-key bout-en-bout (Backend + n8n)

**Effort** : 4h.

### À faire
1. n8n génère un UUID par exécution → header `X-Idempotency-Key` sur chaque callback
2. Backend `WorkflowCallbackService` :
   - Lit le header
   - Stocke en DB avec contrainte unique sur `(workflow_run_id, idempotency_key)`
   - Si déjà vu → 200 OK no-op
3. Migration V7 pour la contrainte unique

### Acceptance
- Rejouer 3x le même callback n8n → l'état change 1 seule fois
- Tests d'intégration WireMock validant la dédup

---

## Livrable 2.5 — Dead-letter queue callbacks (Backend)

**Effort** : 6h.

### À faire
1. Migration V8 : table `failed_callbacks (id, run_id, payload_json, error_message, attempt_count, created_at, last_attempt_at, resolved_at)`
2. `WorkflowCallbackService` : si traitement échoue → insertion dans `failed_callbacks`
3. `@Scheduled` worker `FailedCallbackRetryWorker` : retry jusqu'à 5x avec backoff exponentiel
4. Si > 5 attempts → alerting Slack + statut `RESOLVED='manual'`
5. Endpoint admin `GET /api/video-ops/failed-callbacks` + bouton "Retry" dans le dashboard

### Acceptance
- Aucun callback perdu en cas de panne backend transitoire
- UI admin affiche les callbacks en échec persistant

---

## Livrable 2.6 — Décomposer pages géantes (Frontend)

**Effort** : 16h.

### À faire
**TikTokAccountsPage** → composants :
- `AccountsHeader.tsx`
- `AccountsFilters.tsx`
- `AccountsList.tsx` (cards)
- `AccountsTable.tsx`
- `AccountsModal.tsx` (le formulaire)
- `useAccountsState.ts` (hook centralisant le state, idéalement Zustand store)

**TikTokJourneyPage** → composants :
- `JourneyStepper.tsx`
- `JourneyStepCreation.tsx`
- `JourneyStepRender.tsx`
- `JourneyStepUpload.tsx`
- `JourneyStepPublish.tsx`
- `useJourneyState.ts`

**Critère** : aucun composant > 200 lignes, aucun hook > 100 lignes.

### Acceptance
- Aucun fichier `.tsx` > 200 lignes (sauf cas justifiés)
- Comportement strictement identique
- Tests RTL pour chaque sous-composant

---

## Livrable 2.7 — Design system + Storybook (Frontend)

**Effort** : 12h.

### À faire
1. Créer `src/design-system/` :
   - `tokens.css` (couleurs, espacements, typographie, radius, shadows)
   - `Button.tsx` / `Button.stories.tsx`
   - `Modal.tsx` / `Modal.stories.tsx`
   - `Input.tsx` / `Input.stories.tsx`
   - `Card.tsx`
   - `Pill.tsx`
   - `Toast.tsx`
   - `Spinner.tsx`
2. Migrer les composants existants vers ces primitives (suppression `style={{}}` inline)
3. Storybook setup (`npm install -D @storybook/react-vite`)
4. Storybook déployé sur Chromatic ou Vercel pour preview

### Acceptance
- Storybook rendu propre, aucun `style={}` inline dans les pages
- Toutes les modales utilisent `<Modal>` shared
- Variables CSS uniquement dans `tokens.css`

---

## Livrable 2.8 — i18next (Frontend)

**Effort** : 8h.

### À faire
1. `npm install i18next react-i18next`
2. Setup `src/i18n/` :
   - `index.ts` (init)
   - `locales/fr.json` (toutes les strings actuelles)
   - `locales/en.json` (à remplir progressivement)
3. Remplacer tous les strings hardcodés par `t('clé')`
4. Sélecteur de langue dans le header admin (drapeau)

### Acceptance
- 0 string en dur dans les `.tsx`
- Switcher fr ↔ en fonctionne sur toutes les pages

---

## Livrable 2.9 — react-query partout + queryKeys (Frontend)

**Effort** : 6h.

### À faire
1. Créer `src/queries/keys.ts` :
   ```ts
   export const queryKeys = {
     contentIdeas: { all: ['content-ideas'], list: (filter) => ['content-ideas', 'list', filter], detail: (id) => ['content-ideas', 'detail', id] },
     accounts: { ... },
     dashboard: { ... },
   }
   ```
2. Migrer tous les `useState`+`useEffect`+`fetch` vers `useQuery`
3. Toutes les mutations utilisent `useMutation` + `onSuccess` invalidation
4. Optimistic updates sur DELETE et PATCH
5. `staleTime` adapté par endpoint (dashboard 30s, accounts 60s, ideas detail 5s)

### Acceptance
- Aucun `useEffect` qui fetch
- DELETE d'une idée → carte disparaît immédiatement (rollback si erreur)
- Cache cohérent (pas de double-fetch)

---

## Livrable 2.10 — Polling intelligent (Frontend)

**Effort** : 3h.

### À faire
Dans le composant qui affiche le pipeline d'une idée en cours :
- Pendant `RENDERING_REQUESTED` / `UPLOAD_PREPARING` : `refetchInterval: 1000`
- Pendant `RENDER_READY` / `UPLOAD_COMPLETED` : `refetchInterval: 5000`
- En `PUBLISHED` ou `FAILED` : `refetchInterval: false`

### Acceptance
- UI réactive pendant les workflows actifs
- Pas de polling inutile en idle

---

## Livrable 2.11 — Docker Compose dev local

**Effort** : 4h.

### À faire
Créer `docker-compose.dev.yml` à la racine :
```yaml
services:
  postgres: { image: postgres:16, ports: ['5432:5432'], environment: ... }
  n8n: { image: n8nio/n8n, ports: ['5678:5678'], volumes: ['./Backend/tools/n8n-workflows:/data/workflows'] }
  backend: { build: ./Backend, depends_on: [postgres, n8n], environment: { SPRING_PROFILES_ACTIVE: dev } }
  admin: { build: ./Frontend/admin, ports: ['5174:5174'] }
```

`README.md` mis à jour avec section "Quick start" : `docker compose -f docker-compose.dev.yml up`.

### Acceptance
- Nouveau dev clone le repo, lance la commande, tout marche
- Sub-workflows n8n importés automatiquement au boot

---

## Livrable 2.12 — Profiles Spring (Backend)

**Effort** : 3h.

### À faire
- `application.yml` (commun)
- `application-dev.yml` (CSRF debug, secure-cookies=false, log debug)
- `application-staging.yml`
- `application-prod.yml` (secure-cookies=true, log info, audit verbose)

Secrets via env vars uniquement, jamais en dur. Documenter `.env.example`.

### Acceptance
- `SPRING_PROFILES_ACTIVE=prod` désactive tous les hooks de dev
- Aucun secret commité

---

## Ordre d'exécution recommandé

1. **2.7 Design system** (débloque 2.6 qui consomme les primitives)
2. **2.6 Décomposer pages**
3. **2.9 react-query partout**
4. **2.10 Polling intelligent**
5. **2.8 i18next**
6. **2.1 Splitter VideoOpsService**
7. **2.2 Splitter Controller**
8. **2.3 Sub-workflows n8n**
9. **2.4 Idempotency-key**
10. **2.5 Dead-letter**
11. **2.11 Docker compose**
12. **2.12 Profiles Spring**

---

## Total Phase 2 : ~86h ingé senior, étalable sur 8-10 semaines

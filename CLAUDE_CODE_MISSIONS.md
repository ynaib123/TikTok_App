# 🏗️ Master Plan Ultime : TikTok App Pro-Grade

Ce document définit la vision cible pour transformer l'application en une plateforme industrielle. Il détaille les évolutions techniques, visuelles et fonctionnelles attendues.

---

## ⚖️ Arbitrages tranchés (2026-05-09)

| ID | Question | Décision | Justification |
|----|----------|----------|---------------|
| A1 | Provider IA Mission 5 | **Anthropic Claude** (Sonnet 4.6 par défaut), interface `LlmProvider` pour ouvrir Groq plus tard | `AgentOrchestrator` déjà scaffoldé Anthropic tool-use ; `BootstrapAgents` aligné ; PROGRESS attend `ANTHROPIC_API_KEY` |
| A2 | Séquence steps Mission 4 | `creation → audio → init-publish → upload` (4 steps) | Le step actuel `init-publish` fusionne déjà template+média+rendu (cf commit 0ddc545) |
| A3 | Provider TTS Mission 4 | **ElevenLabs** | Multi-voix FR de qualité, previews, drapeaux. Clé : `ELEVENLABS_API_KEY` (à fournir par user) |

---

## 🛠️ Phase 1 : Architecture & Fondations (Stabilité Industrielle)

### Mission 1 : Refactoring & Modularité (Backend)
*   **Objectif :** Éliminer le service monolithique pour faciliter les évolutions futures.
*   **Tâches :** 
    *   Extraire les responsabilités de `VideoOpsService` en 4 services : `ContentGenerationService`, `VideoRenderService`, `TikTokPublishService`, `WorkflowTrackingService`.
    *   Mettre à jour `VideoOpsController` (Typage strict, fin des `JsonNode`).
*   **Impact UI :** Meilleure gestion des erreurs et des retours d'état dans l'interface.

### Mission 2 : Standardisation React Query & i18n (Frontend)
*   **Objectif :** Unifier la gestion des données et finaliser l'i18n (FR/EN déjà scaffoldé).
*   **État actuel :** `@tanstack/react-query` v5, `i18next` v26 et `react-i18next` v17 déjà installés ; dossier `src/i18n/locales/{fr,en}` présent ; `useAdaptivePolling` déjà câblé sur `contentIdeasQuery` + `dashboard` (Phase 2.10 ✅). La migration `useQuery`/`useMutation` reste partielle (Phase 2.9 ❌).
*   **Tâches :**
    *   Factory de `queryKeys` centralisée (n'existe pas).
    *   Achever la migration des appels services restants vers `useQuery`/`useMutation`.
    *   Extraction systématique des strings hardcodées vers `i18next` (les fichiers JSON locales sont vides ou minimaux).
*   **Impact UI :** Interface plus fluide, chargements instantanés et support multilingue.

### Mission 3 : Rationalisation n8n & Sécurité
*   **Objectif :** Nettoyer l'orchestration et sécuriser les communications.
*   **État actuel :** `bucket4j-core` 8.10.1 **déjà dans `pom.xml`** mais aucun filtre n'est branché. Sub-workflows n8n skippés (Phase 2.3 ❌). Pas de Redis configuré.
*   **Tâches :**
    *   Sub-workflows partagés (`_callback_hmac`, `_error_handler`) — JSON manuel.
    *   Mise en place de **Redis** (ajouter `spring-boot-starter-data-redis` + service docker-compose) pour le cache des quotas et des sessions.
    *   **Rate Limiting** Bucket4j : créer `RateLimitFilter` et l'appliquer sur les routes coûteuses (`/api/video-ops/trigger`, `/api/ai/agents/run`, etc.). Optionnellement back Bucket4j sur Redis pour partager l'état multi-instance.

---

## 🎵 Phase 2 : Studio de Création & Expérience Audio

### Mission 4 : Étape "Audio & Voix" (Fullstack)
*   **Objectif :** Passer de 3 à **4 étapes** : `Creation → Audio → Video (Médias+Rendu) → Publication TikTok`.
*   **État actuel :** Le parcours est défini dans `Frontend/admin/src/pages/TikTokJourneyPage.tsx` (`STEPS` ligne 82) avec 3 entrées : `creation`, `init-publish` (template+média+rendu fusionnés), `upload`. Insérer un step `audio` entre `creation` et `init-publish`. Pas d'intégration ElevenLabs côté backend pour l'instant.
*   **Frontend (Nouveau Studio) :**
    *   Cartes de voix avec drapeaux et bouton **Play** pour tester les voix ElevenLabs.
    *   Visualisation de la **Waveform** (forme d'onde) lors de la prévisualisation.
    *   **Mixeur audio** : Double curseur pour équilibrer Volume Voix / Volume Musique.
*   **Backend & RenderVideo :**
    *   Support multi-pistes audio dans le moteur Remotion.
    *   Téléchargement des assets audio en parallèle (accélération du rendu).

---

## 🤖 Phase 3 : Intelligence Artificielle & Supervision 3D

### Mission 5 : Activation de l'IA (Backend)
*   **Objectif :** Rendre les agents autonomes et stratégiques.
*   **⚠️ Conflit de provider à arbitrer :** l'`AgentOrchestrator` actuel (Phase 3.1 🟡) est scaffoldé pour **Anthropic SDK + tool-use loop** (cf. commentaire ligne 30 + flag `app.ai.agents.enabled`). En parallèle, `application.yml` réserve déjà des slots Resilience4j pour `groq`. **Décision à prendre** : Anthropic (cohérent avec l'infra existante) **ou** Groq Llama-3 (plus rapide + moins cher) **ou** les deux derrière une interface `LlmProvider`.
*   **Tâches :**
    *   Câbler le provider choisi dans `runAgentLoop` (actuellement throw 501).
    *   Transformer l'agent `ping` (stub `BootstrapAgents`) en `strategist` capable d'utiliser des `AgentTool` qui lisent la DB (tendances, perfs publication).
    *   Métriques de tokens / coûts par run dans `AgentRun` + `VideoOpsMetrics`.

### Mission 6 : Page de Supervision "AI Agents" (3D)
*   **Objectif :** Visualiser "l'âme" de l'application.
*   **Tâches :**
    *   Interface immersive avec **Three.js**.
    *   Schéma 3D dynamique : **User ↔️ Groq Agent ↔️ Backend ↔️ PostgreSQL**.
    *   **Flux de particules lumineuses** montrant les échanges de données en temps réel.
    *   Terminal de log style "Matrix" affichant les pensées de l'IA.

---

## 🚀 Phase 4 : Performance & Qualité (Finalisation)

### Mission 7 : Optimisation du Rendu Vidéo
*   **Vitesse :** Téléchargement parallèle des médias et de l'audio.
*   **Push Notifications :** Remplacer le polling par des notifications instantanées pour informer de la fin d'un rendu.
*   **Robustesse :** Auto-correction des scripts mal formés par l'IA.

### Mission 8 : Couverture de Tests Industriels
*   **Backend :** Tests d'intégration Postgres via **Testcontainers**.
*   **Frontend :** Tests **Playwright** couvrant le parcours complet de A à Z.

---

## 🏁 Résultat Visuel Final
*   Un **Studio de Création** digne d'un SaaS Premium.
*   Une interface cohérente utilisant le **Design System** à 100% (boutons, modales, animations).
*   Une visibilité totale sur l'IA grâce à la **visualisation 3D**.
*   Un système **ultra-rapide** grâce au cache Redis et aux téléchargements parallèles.

---

## 📦 Dépendances à installer

*   **Frontend (à installer) :** `three`, `@react-three/fiber`, `@react-three/drei`, `lucide-react`.
*   **Frontend (déjà présents — ne pas réinstaller) :** `i18next` v26, `react-i18next` v17, `@tanstack/react-query` v5, `@playwright/test` v1.59.
*   **Backend (à installer) :** `spring-boot-starter-data-redis`, dépendances Anthropic ou Groq selon arbitrage Mission 5.
*   **Backend (déjà présents — ne pas réinstaller) :** `bucket4j-core` 8.10.1, `testcontainers` (partiel), `springdoc-openapi`, `resilience4j`, `micrometer-prometheus`.

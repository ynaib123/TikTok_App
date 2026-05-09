# 🏗️ Master Plan : Chantier TikTok App Pro-Grade

Ce document est le guide de référence pour transformer l'application en une plateforme industrielle. Il doit être suivi par phases pour garantir la stabilité du système.

---

## 🛠️ Phase 1 : Architecture & Fondations (Priorité Haute)

### Mission 1 : Refactoring & Modularité (Backend)
*   **Objectif :** Décomposer le service monolithique `VideoOpsService`.
*   **Tâches :** 
    *   Extraire les responsabilités en 4 services : `ContentGenerationService`, `VideoRenderService`, `TikTokPublishService`, `WorkflowTrackingService`.
    *   Mettre à jour `VideoOpsController` pour utiliser ces nouveaux services.
    *   S'assurer que tous les tests d'intégration restent au vert.

### Mission 2 : Standardisation & i18n (Frontend)
*   **Objectif :** Centraliser la donnée et préparer l'internationalisation.
*   **Tâches :**
    *   Centraliser les `queryKeys` de React Query.
    *   Migrer les derniers `fetch` manuels vers `useQuery`/`useMutation`.
    *   Configurer `i18next` et extraire les textes vers `locales/fr.json`.
    *   Adoption du Design System à 100% (Button, Modal, Pill, Spinner).

### Mission 3 : Rationalisation n8n
*   **Objectif :** Supprimer la duplication de code dans l'orchestration.
*   **Tâches :** Créer des sub-workflows partagés pour : `_callback_hmac`, `_error_handler`, `_retry_logic`.

---

## 🎵 Phase 2 : Enrichissement du Parcours TikTok

### Mission 4 : Étape "Audio & Voix" (Fullstack)
*   **Objectif :** Permettre le choix de la musique et de la voix off.
*   **Tâches :**
    *   **Frontend :** Ajouter une étape "Audio" dans `TikTokStepScreen.tsx`. Interface de sélection de voix (ElevenLabs/TikTok) et de musique de fond.
    *   **Backend :** Mettre à jour le contrat de rendu pour inclure les paramètres audio.
    *   **RenderVideo :** Intégrer la gestion des pistes audio multiples dans le moteur Remotion.

---

## 🤖 Phase 3 : Intelligence Artificielle & Supervision 3D

### Mission 5 : Activation de l'IA avec Groq (Backend)
*   **Objectif :** Rendre les agents autonomes fonctionnels.
*   **Tâches :**
    *   Brancher `AgentOrchestrator.java` sur `Groq` (Llama-3).
    *   Implémenter la boucle "Tool-Use" (lecture DB, analyse, décision).
    *   Transformer l'agent `ping` en `groq-strategist`.

### Mission 6 : Supervision 3D "AI Agents" (Frontend)
*   **Objectif :** Visualiser le fonctionnement de l'IA.
*   **Tâches :**
    *   Créer la page `AiAgentsPage.tsx` avec **Three.js**.
    *   Visualiser le flux : **User ↔️ Agent ↔️ Backend ↔️ DB** sous forme de schéma 3D dynamique.
    *   Console de logs temps réel branchée sur `agent_runs`.

---

## 🚀 Phase 4 : Performance, Sécurité & Industrialisation

### Mission 7 : Cache & Limites (Performance)
*   **Objectif :** Protéger le serveur et les quotas API.
*   **Tâches :**
    *   Intégrer **Redis** pour le cache des quotas et des sessions.
    *   Implémenter le **Rate Limiting** (Bucket4j) sur les endpoints IA.

### Mission 8 : Couverture de Tests (Qualité)
*   **Objectif :** Sécuriser les déploiements.
*   **Tâches :**
    *   Tests **Testcontainers** (Postgres réel) pour le Backend.
    *   Tests **Playwright** pour le parcours complet (Idée -> Audio -> Rendu).

---

## 🏁 Résultat Attendu
Une application robuste, modulaire, capable de générer des vidéos avec audio personnalisé, supervisée par une interface 3D futuriste et protégée par une architecture de niveau production.

---

## 📦 Dépendances à installer (Récapitulatif)

### Frontend (Admin) :
*   **Mission 2 :** `npm install i18next react-i18next i18next-browser-languagedetector`
*   **Mission 4 :** `npm install lucide-react` (si non présent pour les icônes audio)
*   **Mission 6 :** `npm install three @react-three/fiber @react-three/drei`

### Backend :
*   **Mission 7 :** `pom.xml` -> `spring-boot-starter-data-redis`, `bucket4j-core`
*   **Mission 8 :** `pom.xml` -> `testcontainers`, `junit-jupiter`, `postgresql` (test scope)

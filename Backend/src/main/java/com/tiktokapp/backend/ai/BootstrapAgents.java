package com.tiktokapp.backend.ai;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Registers the available agent definitions at boot.
 *
 * <p>Today :
 * <ul>
 *   <li>{@code ping} — smoke-test agent that bounces input back through the
 *       Claude tool-use loop without any tools. Useful to confirm the
 *       provider is wired without hitting the DB.</li>
 *   <li>{@code strategist} — read-only content strategist with three DB
 *       tools (top topics, publish KPIs, pending ideas). Suggests what
 *       to work on next based on the current backlog.</li>
 * </ul>
 *
 * <p>The default model id resolves from {@code app.anthropic.default-model-id}
 * so flipping a single env var bumps every agent at once.
 */
// @Lazy(false) : application-dev.yml active spring.main.lazy-initialization=true.
// BootstrapAgents n'est consommé par personne (il enregistre des agents via
// effet de bord en @PostConstruct), donc en lazy il ne serait JAMAIS instancié.
// Cette annotation force l'instanciation eager au boot.
@Component
@Lazy(false)
public class BootstrapAgents {

    private final AgentRegistry registry;
    private final String defaultModelId;

    public BootstrapAgents(
            AgentRegistry registry,
            @Value("${app.anthropic.default-model-id:claude-sonnet-4-6}") String defaultModelId
    ) {
        this.registry = registry;
        this.defaultModelId = defaultModelId;
    }

    @PostConstruct
    public void registerStubs() {
        registry.register(new AgentDefinition(
                "ping",
                "Ping",
                "Smoke-test agent. Returns the input back as output through the Claude API.",
                AgentDefinition.AgentScope.READ_ONLY,
                "claude-haiku-4-5",
                "You are a smoke-test agent. Echo whatever the user sends back as a single text reply.",
                List.of()
        ));

        registry.register(new AgentDefinition(
                "strategist",
                "Content Strategist",
                "Read-only content strategist. Surveys the backlog and suggests the next move.",
                AgentDefinition.AgentScope.READ_ONLY,
                defaultModelId,
                """
                You are the Content Strategist for a French TikTok publishing pipeline.

                Tools you can call (all read-only):
                - list_top_topics(days, limit) — most-published topics in the recent past.
                - get_publish_kpis(days)        — counts of ideas by publish_status.
                - get_pending_ideas(limit)      — scripted but unpublished backlog.

                Workflow per request :
                1. Use the tools to ground every recommendation in real data.
                2. Decide on at most 3 concrete next moves (publish X, regenerate Y, drop Z).
                3. Reply in French, structured as : "Constat", "Recommandations", "Risques".
                4. Never invent metrics — if a tool returned nothing, say so.

                Be concise. Operators read this between two pomodoros.
                """,
                List.of("list_top_topics", "get_publish_kpis", "get_pending_ideas")
        ));

        // Supervisor : agent conversationnel multi-tours, accessible depuis Telegram
        // (cf. ConversationalAgentService + TelegramController). Opus 4.7 pour les
        // décisions de pilotage qui mélangent contexte conversationnel + appels
        // d'outils write. Pas de scope READ_WRITE_FULL : trigger_publish exige
        // confirmed=true comme garde-fou.
        registry.register(new AgentDefinition(
                "supervisor",
                "Supervisor",
                "Agent conversationnel pour piloter le pipeline TikTok depuis Telegram ou l'admin UI.",
                AgentDefinition.AgentScope.READ_WRITE_LIMITED,
                "claude-opus-4-7",
                """
                Tu es le Supervisor du pipeline TikTok de l'utilisateur. Tu pilotes la creation,
                le rendu et la publication de videos courtes depuis une conversation (Telegram
                ou admin UI). Reponds en francais, ton naturel et concis.

                Contexte technique :
                - Le pipeline a 5 etapes : Creation (idea+script) -> Audio (optionnel) ->
                  Template -> Render (Remotion) -> Publish (TikTok).
                - Les workflows sont async : un trigger renvoie un workflow_run_id et le run
                  termine plus tard. Pour suivre un run, utilise get_pipeline_status.
                - Categories disponibles : Food, Love, Sport, Fitness, Beauty.
                - Templates : tiktok-pro-vertical, tiktok-bold-story, tiktok-clean-minimal,
                  tiktok-scene-sequence (defaut, multi-scenes).

                Outils a ta disposition :
                - list_recent_ideas(limit, status_filter) : voir les idees recentes.
                - get_idea_detail(content_idea_id) : detail d'une idee + ses derniers runs.
                - get_pipeline_status(content_idea_id) : etat actuel d'une idee dans le pipeline.
                - list_tiktok_accounts() : comptes TikTok connectes (pour publier).
                - trigger_main_pipeline(category, language?, topic?, scene_count?, tiktok_account_open_id?)
                  : lance la generation idee+script. Async.
                - trigger_render(content_idea_id, template_id?, quality_profile?) : lance le
                  rendu video. L'idee doit avoir un script.
                - trigger_publish(content_idea_id, tiktok_account_open_id, confirmed) : initialise
                  la publication TikTok. EXIGE confirmed=true.

                Regles strictes :
                1. AVANT trigger_publish : TOUJOURS demander confirmation explicite a l'utilisateur,
                   en resumant idee + compte cible. Ne mets confirmed=true que si l'utilisateur
                   a explicitement valide dans la meme conversation.
                2. Quand un workflow est asynchrone, indique le workflow_run_id et propose a
                   l'utilisateur de te demander get_pipeline_status plus tard.
                3. Si une idee n'a pas de script (has_script=false), refuse trigger_render et
                   propose plutot de relancer trigger_main_pipeline.
                4. Si list_tiktok_accounts retourne 0 comptes, refuse trigger_publish et explique
                   qu'il faut connecter un compte via l'admin UI > Accounts.
                5. Reponses courtes : 2-4 lignes par defaut. Listes a puces si plus de 3 items.
                6. Jamais inventer un id ou un statut : appelle l'outil approprie pour verifier.
                """,
                List.of(
                        "list_recent_ideas",
                        "get_idea_detail",
                        "get_pipeline_status",
                        "list_tiktok_accounts",
                        "trigger_main_pipeline",
                        "trigger_render",
                        "trigger_publish"
                )
        ));
    }
}

package com.tiktokapp.backend.ai;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
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
@Component
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
    }
}

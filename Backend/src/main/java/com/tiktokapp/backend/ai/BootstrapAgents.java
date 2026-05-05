package com.tiktokapp.backend.ai;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Phase 3.1 — registers stub agent definitions at boot so the registry
 * is non-empty for the UI/health checks. Concrete agents (Content
 * Strategist, Script Reviewer, etc.) get registered via their own
 * @Configuration once their tools are wired.
 */
@Component
public class BootstrapAgents {

    private final AgentRegistry registry;

    public BootstrapAgents(AgentRegistry registry) {
        this.registry = registry;
    }

    @PostConstruct
    public void registerStubs() {
        registry.register(new AgentDefinition(
                "ping",
                "Ping",
                "Smoke-test agent. Returns the input back as output.",
                AgentDefinition.AgentScope.READ_ONLY,
                "claude-haiku-4-5",
                "You are a smoke-test agent. Echo whatever the user sends.",
                List.of()
        ));
    }
}

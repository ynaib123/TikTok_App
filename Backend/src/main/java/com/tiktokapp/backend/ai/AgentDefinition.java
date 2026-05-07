package com.tiktokapp.backend.ai;

import java.util.List;

/**
 * Phase 3.1 — declarative description of an AI agent.
 * Concrete agents register one of these via the AgentRegistry.
 */
public record AgentDefinition(
        String agentId,
        String displayName,
        String description,
        AgentScope scope,
        String modelId,
        String systemPrompt,
        List<String> allowedToolNames
) {
    public enum AgentScope {
        READ_ONLY,
        READ_WRITE_LIMITED,
        READ_WRITE_FULL
    }
}

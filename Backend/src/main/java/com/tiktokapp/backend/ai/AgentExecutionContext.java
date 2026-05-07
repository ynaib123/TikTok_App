package com.tiktokapp.backend.ai;

import java.time.Instant;

/**
 * Phase 3.1 — context passed to tools during agent execution.
 * Tools should consult this to enforce scope and identify
 * the requesting admin.
 */
public record AgentExecutionContext(
        String agentId,
        Long agentRunId,
        Long adminId,
        String adminEmail,
        AgentDefinition.AgentScope scope,
        String traceId,
        Instant invokedAt
) {
}

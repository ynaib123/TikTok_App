package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Phase 3.1 — interface a Spring bean implements to expose itself
 * as a tool callable by an AI agent. Tools must be deterministic
 * with respect to inputs, side-effect-aware, and respect their
 * registered scope (READ_ONLY tools must not mutate state).
 */
public interface AgentTool {

    String name();

    String description();

    /** JSON Schema for input parameters, returned as a JsonNode. */
    JsonNode inputSchema();

    /** Execute the tool. Returns a JsonNode that is sent back to the LLM. */
    JsonNode execute(JsonNode input, AgentExecutionContext context);
}

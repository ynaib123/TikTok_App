package com.tiktokapp.backend.ai.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record AgentRunResponse(
        Long runId,
        String status,
        JsonNode output,
        String errorMessage
) {
}

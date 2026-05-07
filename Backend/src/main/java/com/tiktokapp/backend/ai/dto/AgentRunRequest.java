package com.tiktokapp.backend.ai.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;

public record AgentRunRequest(
        @NotBlank String agentId,
        JsonNode input
) {
}

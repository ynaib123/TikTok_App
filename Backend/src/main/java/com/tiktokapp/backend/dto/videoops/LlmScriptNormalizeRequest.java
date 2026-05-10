package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record LlmScriptNormalizeRequest(
        @NotBlank String rawLlmContent,
        @Min(1) @Max(12) int expectedSceneCount,
        String topic,
        String category,
        String language,
        long contentIdeaId,
        long workflowRunId
) {}

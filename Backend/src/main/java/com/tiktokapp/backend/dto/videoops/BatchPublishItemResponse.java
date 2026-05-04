package com.tiktokapp.backend.dto.videoops;

import java.time.Instant;

public record BatchPublishItemResponse(
        Long contentIdeaId,
        String status,
        String errorMessage,
        Long workflowRunId,
        int attemptNumber,
        Instant completedAt
) {}

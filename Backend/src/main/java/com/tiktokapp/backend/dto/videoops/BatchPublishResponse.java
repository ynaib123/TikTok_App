package com.tiktokapp.backend.dto.videoops;

import java.time.Instant;
import java.util.List;

public record BatchPublishResponse(
        String batchId,
        String status,
        int totalCount,
        int completedCount,
        int failedCount,
        int pendingCount,
        Instant createdAt,
        Instant updatedAt,
        Instant completedAt,
        List<BatchPublishItemResponse> items
) {}

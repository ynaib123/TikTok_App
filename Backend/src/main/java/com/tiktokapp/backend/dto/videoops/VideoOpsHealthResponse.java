package com.tiktokapp.backend.dto.videoops;

import java.util.List;
import java.util.Map;

public record VideoOpsHealthResponse(
        String status,
        Component database,
        Component n8n,
        Component alerting,
        WorkflowSummary workflows,
        Map<String, Object> contract
) {
    public record Component(String status, String detail, Long latencyMs) {}

    public record WorkflowSummary(
            long stuckRunsOlderThanThreshold,
            int stuckThresholdSeconds,
            List<String> recentFailures
    ) {}
}

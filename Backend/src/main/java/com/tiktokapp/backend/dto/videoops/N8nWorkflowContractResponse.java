package com.tiktokapp.backend.dto.videoops;

import java.util.List;
import java.util.Map;

public class N8nWorkflowContractResponse {

    private final boolean healthy;
    private final String source;
    private final String baseUrl;
    private final Map<String, String> workflowPaths;
    private final List<String> warnings;
    private final boolean legacyCallbackSecretAllowed;
    private final long stuckRunCount;

    public N8nWorkflowContractResponse(
            boolean healthy,
            String source,
            String baseUrl,
            Map<String, String> workflowPaths,
            List<String> warnings,
            boolean legacyCallbackSecretAllowed,
            long stuckRunCount
    ) {
        this.healthy = healthy;
        this.source = source;
        this.baseUrl = baseUrl;
        this.workflowPaths = workflowPaths;
        this.warnings = warnings;
        this.legacyCallbackSecretAllowed = legacyCallbackSecretAllowed;
        this.stuckRunCount = stuckRunCount;
    }

    public boolean isHealthy() {
        return healthy;
    }

    public String getSource() {
        return source;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public Map<String, String> getWorkflowPaths() {
        return workflowPaths;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public boolean isLegacyCallbackSecretAllowed() {
        return legacyCallbackSecretAllowed;
    }

    public long getStuckRunCount() {
        return stuckRunCount;
    }
}

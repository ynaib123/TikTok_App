package com.tiktokapp.backend.service.videoops;

import java.util.Map;

public record ResolvedN8nWorkflowConfiguration(
        String source,
        String baseUrl,
        Map<String, String> workflowPaths
) {
}

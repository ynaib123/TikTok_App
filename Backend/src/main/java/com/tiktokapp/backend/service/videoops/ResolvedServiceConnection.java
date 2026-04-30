package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;

public record ResolvedServiceConnection(
        String baseUrl,
        String secretValue,
        String accountIdentifier,
        String displayName,
        JsonNode metadata
) {
}

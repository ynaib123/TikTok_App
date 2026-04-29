package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VideoOpsCallbackAuthServiceTest {

    @Test
    void validatesHmacSignedCallback() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setWorkflowCallbackHmacSecret("hmac-secret-demo");
        properties.setWorkflowCallbackMaxSkewSeconds(300);
        properties.setAllowLegacyWorkflowCallbackSecret(false);

        VideoOpsCallbackAuthService service = new VideoOpsCallbackAuthService(properties);
        String timestamp = Instant.now().toString();
        String body = "{\"status\":\"SUCCEEDED\"}";
        String signature = service.computeSignature("POST", "/api/video-ops/workflow-runs/99/complete", body, timestamp);

        assertDoesNotThrow(() -> service.validateCallback(
                "POST",
                "/api/video-ops/workflow-runs/99/complete",
                body,
                timestamp,
                signature,
                null
        ));
    }

    @Test
    void rejectsInvalidHmacSignature() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setWorkflowCallbackHmacSecret("hmac-secret-demo");
        properties.setWorkflowCallbackMaxSkewSeconds(300);
        properties.setAllowLegacyWorkflowCallbackSecret(false);

        VideoOpsCallbackAuthService service = new VideoOpsCallbackAuthService(properties);

        assertThrows(RuntimeException.class, () -> service.validateCallback(
                "POST",
                "/api/video-ops/workflow-runs/99/complete",
                "{\"status\":\"SUCCEEDED\"}",
                Instant.now().toString(),
                "broken-signature",
                null
        ));
    }
}

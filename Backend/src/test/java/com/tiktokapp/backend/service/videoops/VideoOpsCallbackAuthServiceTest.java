package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class VideoOpsCallbackAuthServiceTest {

    private VideoOpsProperties properties;
    private VideoOpsCallbackAuthService service;

    @BeforeEach
    void setUp() {
        properties = new VideoOpsProperties();
        properties.setWorkflowCallbackSecret("my-callback-secret");
        properties.setWorkflowCallbackHmacSecret("hmac-secret-demo");
        properties.setWorkflowCallbackMaxSkewSeconds(300);
        properties.setAllowLegacyWorkflowCallbackSecret(false);
        service = new VideoOpsCallbackAuthService(properties);
    }

    @Test
    void validatesHmacSignedCallback() {
        String timestamp = Instant.now().toString();
        String body = "{\"status\":\"SUCCEEDED\"}";
        String signature = service.computeSignature("POST", "/api/video-ops/workflow-runs/99/complete", body, timestamp);

        assertDoesNotThrow(() -> service.validateCallback(
                "POST", "/api/video-ops/workflow-runs/99/complete", body, timestamp, signature, null
        ));
    }

    @Test
    void rejectsInvalidHmacSignature() {
        assertThatThrownBy(() -> service.validateCallback(
                "POST", "/api/video-ops/workflow-runs/99/complete",
                "{\"status\":\"SUCCEEDED\"}", Instant.now().toString(), "broken-signature", null
        )).isInstanceOf(ResponseStatusException.class)
          .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void rejectsExpiredHmacTimestamp() {
        String oldTimestamp = Instant.now().minusSeconds(400).toString();
        String body = "{}";
        String signature = service.computeSignature("POST", "/path", body, oldTimestamp);

        assertThatThrownBy(() -> service.validateCallback("POST", "/path", body, oldTimestamp, signature, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void rejectsMissingSignatureWhenLegacyDisabled() {
        assertThatThrownBy(() -> service.validateCallback("POST", "/path", "{}", null, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void acceptsCorrectLegacySecret() {
        properties.setAllowLegacyWorkflowCallbackSecret(true);

        assertDoesNotThrow(() ->
                service.validateCallback("POST", "/path", "{}", null, null, "my-callback-secret")
        );
    }

    @Test
    void rejectsWrongLegacySecret() {
        properties.setAllowLegacyWorkflowCallbackSecret(true);

        assertThatThrownBy(() -> service.validateCallback("POST", "/path", "{}", null, null, "wrong"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void rejectsNullLegacySecretWhenLegacyEnabled() {
        properties.setAllowLegacyWorkflowCallbackSecret(true);

        assertThatThrownBy(() -> service.validateCallback("POST", "/path", "{}", null, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void rejects503WhenLegacySecretNotConfigured() {
        properties.setAllowLegacyWorkflowCallbackSecret(true);
        properties.setWorkflowCallbackSecret(null);

        assertThatThrownBy(() -> service.validateCallback("POST", "/path", "{}", null, null, "any"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    void rejects503WhenHmacSecretNotConfigured() {
        properties.setWorkflowCallbackHmacSecret(null);
        String timestamp = Instant.now().toString();

        assertThatThrownBy(() -> service.validateCallback("POST", "/path", "{}", timestamp, "sig", null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }
}

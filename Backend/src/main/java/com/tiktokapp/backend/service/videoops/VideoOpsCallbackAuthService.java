package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

@Service
public class VideoOpsCallbackAuthService {

    public static final String TIMESTAMP_HEADER = "X-Video-Ops-Callback-Timestamp";
    public static final String SIGNATURE_HEADER = "X-Video-Ops-Callback-Signature";
    public static final String LEGACY_SECRET_HEADER = "X-Video-Ops-Callback-Secret";

    private final VideoOpsProperties properties;

    public VideoOpsCallbackAuthService(VideoOpsProperties properties) {
        this.properties = properties;
    }

    public void validateCallback(String method, String path, String body, String timestamp, String signature, String legacySecret) {
        if (hasText(signature) || hasText(timestamp)) {
            validateHmac(method, path, body, timestamp, signature);
            return;
        }

        if (properties.isAllowLegacyWorkflowCallbackSecret()) {
            validateLegacySecret(legacySecret);
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Signature callback manquante.");
    }

    public String computeSignature(String method, String path, String body, String timestamp) {
        String configuredSecret = trimToNull(properties.getWorkflowCallbackHmacSecret());
        if (configuredSecret == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Le secret HMAC des callbacks workflow n'est pas configure.");
        }

        String payloadHash = sha256Base64(body == null ? "" : body);
        String canonical = String.join("\n",
                upper(method),
                path == null ? "" : path,
                timestamp == null ? "" : timestamp,
                payloadHash
        );
        return hmacBase64(configuredSecret, canonical);
    }

    private void validateHmac(String method, String path, String body, String timestamp, String providedSignature) {
        String configuredSecret = trimToNull(properties.getWorkflowCallbackHmacSecret());
        if (configuredSecret == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Le secret HMAC des callbacks workflow n'est pas configure.");
        }
        if (!hasText(timestamp) || !hasText(providedSignature)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Les headers HMAC du callback sont incomplets.");
        }

        Instant callbackInstant;
        try {
            callbackInstant = Instant.parse(timestamp.trim());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Le timestamp du callback est invalide.", exception);
        }

        long skewSeconds = Math.abs(Instant.now().getEpochSecond() - callbackInstant.getEpochSecond());
        if (skewSeconds > Math.max(30, properties.getWorkflowCallbackMaxSkewSeconds())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Le callback workflow est expire.");
        }

        String expectedSignature = computeSignature(method, path, body, timestamp.trim());
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), providedSignature.trim().getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Signature callback invalide.");
        }
    }

    private void validateLegacySecret(String providedSecret) {
        String configuredSecret = trimToNull(properties.getWorkflowCallbackSecret());
        if (configuredSecret == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Le secret de callback workflow n'est pas configure.");
        }
        if (!configuredSecret.equals(trimToNull(providedSecret == null ? "" : providedSecret))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Callback workflow refuse.");
        }
    }

    private String hmacBase64(String secret, String canonical) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de calculer la signature HMAC.", exception);
        }
    }

    private String sha256Base64(String body) {
        try {
            return Base64.getEncoder().encodeToString(
                    MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de calculer le hash du callback.", exception);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean hasText(String value) {
        return trimToNull(value) != null;
    }

    private String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}

package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VideoOpsInternalAuthService {

    public static final String HEADER_NAME = "X-Video-Ops-Internal-Secret";

    private final VideoOpsProperties properties;

    public VideoOpsInternalAuthService(VideoOpsProperties properties) {
        this.properties = properties;
    }

    public void validateSecret(String providedSecret) {
        String configuredSecret = trimToNull(properties.getInternalApiSecret());
        if (configuredSecret == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Le secret interne video ops n'est pas configure.");
        }
        if (!configuredSecret.equals(trimToNull(providedSecret))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces interne video ops refuse.");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

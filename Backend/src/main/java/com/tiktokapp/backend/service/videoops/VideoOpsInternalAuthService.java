package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

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
        // Comparaison time-safe : bloque les attaques de timing qui peuvent
        // recuperer le secret octet par octet en mesurant la latence du equals().
        if (!constantTimeEquals(configuredSecret, trimToNull(providedSecret))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces interne video ops refuse.");
        }
    }

    /**
     * Comparaison constante en temps. Retourne false des qu'une des deux
     * valeurs est null ou que les longueurs different (lecture symetrique
     * des bytes seulement quand les longueurs sont egales).
     */
    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) return false;
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = actual.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

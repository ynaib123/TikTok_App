package com.tiktokapp.backend.web.security;

import com.tiktokapp.backend.config.VideoOpsProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Filtre HTTP dédié aux endpoints internes /api/video-ops/internal/**.
 * Applique la vérification du secret avant que la requête n'atteigne le controller,
 * centralisant la protection au niveau de la chaîne de filtres plutôt que dans chaque service.
 */
@Component
public class InternalSecretFilter extends OncePerRequestFilter {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private static final String INTERNAL_PATTERN = "/api/video-ops/internal/**";
    public static final String HEADER_NAME = "X-Video-Ops-Internal-Secret";

    private final VideoOpsProperties properties;

    public InternalSecretFilter(VideoOpsProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!MATCHER.match(INTERNAL_PATTERN, path)) {
            chain.doFilter(request, response);
            return;
        }

        String configuredSecret = trimToNull(properties.getInternalApiSecret());
        String providedSecret = trimToNull(request.getHeader(HEADER_NAME));

        if (configuredSecret == null) {
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"service_unavailable\",\"message\":\"Secret interne non configure.\"}");
            return;
        }

        if (!constantTimeEquals(configuredSecret, providedSecret)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"forbidden\",\"message\":\"Acces interne refuse.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) return false;
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = actual.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

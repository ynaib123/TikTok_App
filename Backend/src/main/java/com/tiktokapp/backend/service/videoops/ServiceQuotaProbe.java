package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.RateUsageDto;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Probes provider APIs for live quota usage. Pexels exposes monthly quota
 * via X-Ratelimit-* headers; Shotstack exposes plan usage at /me.
 * Groq and TikTok have no public quota endpoints — return null.
 *
 * Results are cached in-memory for 60s per provider+secret to avoid
 * hitting providers on every accounts overview render.
 */
@Service
public class ServiceQuotaProbe {

    private static final Logger logger = LoggerFactory.getLogger(ServiceQuotaProbe.class);
    private static final Duration CACHE_TTL = Duration.ofSeconds(60);
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Map<String, CachedQuota> cache = new ConcurrentHashMap<>();

    public ServiceQuotaProbe() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(HTTP_TIMEOUT)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public Optional<RateUsageDto> probe(ServiceConnectionProvider provider, String baseUrl, String secret) {
        if (provider == null || secret == null || secret.isBlank()) {
            return Optional.empty();
        }
        String cacheKey = provider.name() + ":" + Integer.toHexString(secret.hashCode());
        CachedQuota cached = cache.get(cacheKey);
        long now = System.currentTimeMillis();
        if (cached != null && (now - cached.timestampMillis) < CACHE_TTL.toMillis()) {
            return Optional.ofNullable(cached.value);
        }

        RateUsageDto value;
        try {
            value = switch (provider) {
                case PEXELS -> probePexels(baseUrl, secret);
                case SHOTSTACK -> probeShotstack(baseUrl, secret);
                default -> null;
            };
        } catch (Exception exception) {
            logger.debug("quota probe failed provider={} error={}", provider, exception.getMessage());
            value = null;
        }

        cache.put(cacheKey, new CachedQuota(now, value));
        return Optional.ofNullable(value);
    }

    @CircuitBreaker(name = "pexels", fallbackMethod = "probeFallback")
    public RateUsageDto probePexels(String baseUrl, String secret) throws Exception {
        String url = (baseUrl == null || baseUrl.isBlank() ? "https://api.pexels.com" : baseUrl.trim())
                + "/videos/popular?per_page=1";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(HTTP_TIMEOUT)
                .header("Authorization", secret)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return null;
        }
        long limit = response.headers().firstValueAsLong("X-Ratelimit-Limit").orElse(-1);
        long remaining = response.headers().firstValueAsLong("X-Ratelimit-Remaining").orElse(-1);
        if (limit <= 0 || remaining < 0) {
            return null;
        }
        return new RateUsageDto(Math.max(0, limit - remaining), limit);
    }

    @CircuitBreaker(name = "shotstack", fallbackMethod = "probeFallback")
    public RateUsageDto probeShotstack(String baseUrl, String secret) throws Exception {
        // Shotstack /me sits on the production host regardless of edit/v1 path.
        String url = "https://api.shotstack.io/edit/v1/me";
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(HTTP_TIMEOUT)
                .header("x-api-key", secret)
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return null;
        }
        JsonNode root = objectMapper.readTree(response.body());
        JsonNode usage = root.path("response").path("usage");
        long used = usage.path("renders").asLong(-1);
        long limit = usage.path("plan").path("renders").asLong(-1);
        if (used < 0 || limit <= 0) {
            return null;
        }
        return new RateUsageDto(used, limit);
    }

    @SuppressWarnings("unused")
    private RateUsageDto probeFallback(String baseUrl, String secret, Throwable cause) {
        logger.debug("quota probe fallback baseUrl={} cause={}", baseUrl, cause.getMessage());
        return null;
    }

    private record CachedQuota(long timestampMillis, RateUsageDto value) {}
}

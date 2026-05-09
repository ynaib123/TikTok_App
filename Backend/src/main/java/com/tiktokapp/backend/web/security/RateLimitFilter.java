package com.tiktokapp.backend.web.security;

import com.tiktokapp.backend.config.RateLimitProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting par IP, in-memory (Bucket4j).
 * <p>
 * Cible deux familles d'endpoints sensibles :
 * <ul>
 *   <li>{@code POST /api/admins/login} : anti brute-force credentials</li>
 *   <li>{@code POST /api/video-ops/workflows/**} : anti spam d'orchestration</li>
 * </ul>
 * Limites par defaut configurables via {@code app.rate-limit.*}.
 * <p>
 * Stockage in-memory : suffisant pour 1 instance backend. Pour scaler horizontalement,
 * remplacer le {@code ConcurrentHashMap} par un ProxyManager Bucket4j (Redis / Hazelcast).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
    private static final String LOGIN_PATH = "/api/admins/login";
    private static final String WORKFLOWS_PATTERN = "/api/video-ops/workflows/**";
    private static final String AI_AGENTS_PATTERN = "/api/ai/agents/**";
    private static final String AUDIO_PATTERN = "/api/audio/**";

    private final RateLimitProperties properties;
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> workflowBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> aiAgentBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> audioBuckets = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (!properties.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        Bucket bucket = resolveBucket(path, request);
        if (bucket == null) {
            chain.doFilter(request, response);
            return;
        }

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(request, response);
            return;
        }

        long retryAfterSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
        log.warn("rate-limit: rejected {} {} for ip={} retryAfter={}s",
                request.getMethod(), path, clientIp(request), retryAfterSeconds);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"error\":\"rate_limited\",\"retryAfterSeconds\":" + retryAfterSeconds + "}"
        );
    }

    private Bucket resolveBucket(String path, HttpServletRequest request) {
        String key = clientIp(request);
        if (LOGIN_PATH.equals(path)) {
            return loginBuckets.computeIfAbsent(key, k -> newBucket(properties.getLogin()));
        }
        if (PATH_MATCHER.match(WORKFLOWS_PATTERN, path)) {
            return workflowBuckets.computeIfAbsent(key, k -> newBucket(properties.getWorkflows()));
        }
        if (PATH_MATCHER.match(AI_AGENTS_PATTERN, path)) {
            return aiAgentBuckets.computeIfAbsent(key, k -> newBucket(properties.getAiAgents()));
        }
        if (PATH_MATCHER.match(AUDIO_PATTERN, path)) {
            return audioBuckets.computeIfAbsent(key, k -> newBucket(properties.getAudio()));
        }
        return null;
    }

    private Bucket newBucket(RateLimitProperties.Bucket cfg) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(cfg.getCapacity())
                .refillGreedy(cfg.getCapacity(), Duration.ofSeconds(cfg.getRefillSeconds()))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}

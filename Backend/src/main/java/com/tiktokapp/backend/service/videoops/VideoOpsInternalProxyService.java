package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class VideoOpsInternalProxyService {

    private static final Logger logger = LoggerFactory.getLogger(VideoOpsInternalProxyService.class);

    private final ServiceConnectionResolver connectionResolver;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public VideoOpsInternalProxyService(
            ServiceConnectionResolver connectionResolver,
            ObjectMapper objectMapper
    ) {
        this.connectionResolver = connectionResolver;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @CircuitBreaker(name = "groq", fallbackMethod = "proxyGroqChatCompletionsFallback")
    @Retry(name = "groq")
    public JsonNode proxyGroqChatCompletions(JsonNode requestBody) {
        ResolvedServiceConnection groq = connectionResolver.requireConnected(ServiceConnectionProvider.GROQ);
        String baseUrl = normalizeGroqApiBaseUrl(groq.baseUrl(), "https://api.groq.com");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groq.secretValue())
                .POST(HttpRequest.BodyPublishers.ofString(toJson(requestBody)))
                .build();
        return sendJson(request, "Groq");
    }

    @SuppressWarnings("unused")
    private JsonNode proxyGroqChatCompletionsFallback(JsonNode requestBody, Throwable cause) {
        logger.warn("groq circuit breaker open or retries exhausted: {}", cause.getMessage());
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Groq est indisponible. Reessaie dans 30s.",
                cause
        );
    }

    public JsonNode proxyPexelsVideoSearch(String query, Integer perPage, String orientation) {
        ResolvedServiceConnection pexels = connectionResolver.requireConnected(ServiceConnectionProvider.PEXELS);
        String baseUrl = normalizeBaseUrl(pexels.baseUrl(), "https://api.pexels.com");
        int normalizedPerPage = perPage == null ? 5 : Math.max(1, Math.min(80, perPage));
        String normalizedOrientation = trimToNull(orientation) == null ? "portrait" : orientation.trim();
        String url = baseUrl
                + "/videos/search?query=" + encode(query)
                + "&per_page=" + normalizedPerPage
                + "&orientation=" + encode(normalizedOrientation);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", pexels.secretValue())
                .GET()
                .build();
        return sendJson(request, "Pexels");
    }

    public JsonNode proxyShotstackRender(JsonNode requestBody) {
        ResolvedServiceConnection shotstack = connectionResolver.requireConnected(ServiceConnectionProvider.SHOTSTACK);
        String baseUrl = normalizeShotstackEditBaseUrl(shotstack.baseUrl(), "https://api.shotstack.io");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/render"))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("x-api-key", shotstack.secretValue())
                .POST(HttpRequest.BodyPublishers.ofString(toJson(requestBody)))
                .build();
        return sendJson(request, "Shotstack");
    }

    public JsonNode proxyShotstackRenderStatus(String renderId) {
        if (trimToNull(renderId) == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "renderId est obligatoire.");
        }
        ResolvedServiceConnection shotstack = connectionResolver.requireConnected(ServiceConnectionProvider.SHOTSTACK);
        String baseUrl = normalizeShotstackEditBaseUrl(shotstack.baseUrl(), "https://api.shotstack.io");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/render/" + encode(renderId.trim())))
                .timeout(Duration.ofSeconds(30))
                .header("x-api-key", shotstack.secretValue())
                .GET()
                .build();
        return sendJson(request, "Shotstack");
    }

    private JsonNode sendJson(HttpRequest request, String providerName) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            JsonNode payload = body == null || body.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(body);
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String snippet = body != null && !body.isBlank()
                        ? " — " + body.substring(0, Math.min(400, body.length()))
                        : "";
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        providerName + " a repondu " + response.statusCode() + snippet
                );
            }
            return payload;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Appel " + providerName + " interrompu.", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible d'appeler " + providerName + ".", exception);
        }
    }

    private String toJson(JsonNode value) {
        try {
            return objectMapper.writeValueAsString(value == null ? objectMapper.createObjectNode() : value);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de serialiser la requete proxy.", exception);
        }
    }

    private String normalizeBaseUrl(String rawBaseUrl, String fallback) {
        String normalized = trimToNull(rawBaseUrl);
        return (normalized == null ? fallback : normalized).replaceAll("/+$", "");
    }

    private String normalizeGroqApiBaseUrl(String rawBaseUrl, String fallback) {
        String normalized = normalizeBaseUrl(rawBaseUrl, fallback);
        if (normalized.endsWith("/openai/v1")) {
            return normalized;
        }
        if (normalized.endsWith("/openai")) {
            return normalized + "/v1";
        }
        return normalized + "/openai/v1";
    }

    private String normalizeShotstackEditBaseUrl(String rawBaseUrl, String fallback) {
        String normalized = normalizeBaseUrl(rawBaseUrl, fallback);
        if (normalized.endsWith("/edit/v1") || normalized.endsWith("/edit/stage")) {
            return normalized;
        }
        if (normalized.endsWith("/v1") || normalized.endsWith("/stage")) {
            return normalized.startsWith("https://api.shotstack.io/edit/")
                    ? normalized
                    : normalized.replace("https://api.shotstack.io", "https://api.shotstack.io/edit");
        }
        return normalized + "/edit/v1";
    }

    private String encode(String value) {
        return URLEncoder.encode(String.valueOf(value), StandardCharsets.UTF_8);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

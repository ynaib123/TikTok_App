package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import com.tiktokapp.backend.model.ServiceConnectionValidationStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ServiceConnectionGatewayService {
    private static final Logger logger = LoggerFactory.getLogger(ServiceConnectionGatewayService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ServiceConnectionGatewayService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public ServiceConnectionValidationResult validate(
            ServiceConnectionProvider provider,
            String baseUrl,
            String secretValue,
            String accountIdentifier
    ) {
        return switch (provider) {
            case SUPABASE -> validateSupabase(baseUrl, secretValue);
            case GROQ -> validateGroq(baseUrl, secretValue);
            case PEXELS -> validatePexels(baseUrl, secretValue);
            case SHOTSTACK -> throw unsupportedProvider(provider);
            case N8N -> validateN8n(baseUrl, secretValue, accountIdentifier);
        };
    }

    private ServiceConnectionValidationResult validateSupabase(String baseUrl, String secretValue) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(stripTrailingSlash(baseUrl) + "/rest/v1/tiktok_accounts?select=id&limit=1"))
                .timeout(Duration.ofSeconds(20))
                .header("apikey", secretValue)
                .header("Authorization", "Bearer " + secretValue)
                .GET()
                .build();
        return execute(providerMessage("Supabase"), request, 200, 299);
    }

    private ServiceConnectionValidationResult validateGroq(String baseUrl, String secretValue) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(normalizeGroqApiBaseUrl(baseUrl) + "/models"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + secretValue)
                .header("Content-Type", "application/json")
                .GET()
                .build();
        return execute(providerMessage("Groq"), request, 200, 299);
    }

    private ServiceConnectionValidationResult validatePexels(String baseUrl, String secretValue) {
        String query = URLEncoder.encode("fitness", StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(stripTrailingSlash(baseUrl) + "/videos/search?query=" + query + "&per_page=1"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", secretValue)
                .GET()
                .build();
        return execute(providerMessage("Pexels"), request, 200, 299);
    }

    private ServiceConnectionValidationResult validateN8n(String baseUrl, String secretValue, String accountIdentifier) {
        List<String> candidateBaseUrls = n8nCandidateBaseUrls(baseUrl);
        ResponseStatusException lastException = null;

        for (String candidateBaseUrl : candidateBaseUrls) {
            try {
                logger.info("validating n8n connection against {}", candidateBaseUrl);
                ServiceConnectionValidationResult healthCheck = executeN8nHealthcheck(candidateBaseUrl);
                String suffix = candidateBaseUrl.equals(stripTrailingSlash(baseUrl))
                        ? ""
                        : " Validation reseau via " + candidateBaseUrl + ".";
                return new ServiceConnectionValidationResult(
                        ServiceConnectionValidationStatus.VALID,
                        healthCheck.message() + suffix + " Secret interne conserve pour les callbacks video ops."
                );
            } catch (ResponseStatusException exception) {
                logger.warn("n8n validation failed against {}: {}", candidateBaseUrl, exception.getReason());
                lastException = exception;
            }
        }

        if (lastException != null) {
            throw lastException;
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de contacter n8n.");
    }

    private ServiceConnectionValidationResult execute(String providerName, HttpRequest request, int minStatus, int maxStatus) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= minStatus && response.statusCode() <= maxStatus) {
                return new ServiceConnectionValidationResult(
                        ServiceConnectionValidationStatus.VALID,
                        providerName + " a repondu " + response.statusCode() + "."
                );
            }
            throw invalid(providerName, response.statusCode(), response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, providerName + " ne repond pas.", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de contacter " + providerName + ".", exception);
        }
    }

    private ServiceConnectionValidationResult executeLenient(String providerName, HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 500) {
                return new ServiceConnectionValidationResult(
                        ServiceConnectionValidationStatus.VALID,
                        providerName + " est joignable (" + response.statusCode() + ")."
                );
            }
            throw invalid(providerName, response.statusCode(), response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, providerName + " ne repond pas.", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de contacter " + providerName + ".", exception);
        }
    }

    private ResponseStatusException invalid(String providerName, int statusCode, String body) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", providerName);
        payload.put("statusCode", statusCode);
        payload.put("body", body == null ? "" : body);
        String message = providerName + " a refuse la connexion avec le statut " + statusCode + ".";
        try {
            message += " Details: " + objectMapper.writeValueAsString(payload);
        } catch (Exception ignored) {
            // Keep the short message when serialization fails.
        }
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, message);
    }

    private String stripTrailingSlash(String value) {
        return value == null ? "" : value.replaceAll("/+$", "");
    }

    private String normalizeGroqApiBaseUrl(String rawBaseUrl) {
        String normalized = stripTrailingSlash(rawBaseUrl);
        if (normalized.endsWith("/openai/v1")) {
            return normalized;
        }
        if (normalized.endsWith("/openai")) {
            return normalized + "/v1";
        }
        return normalized + "/openai/v1";
    }

    private String providerMessage(String providerName) {
        return providerName;
    }

    private ResponseStatusException unsupportedProvider(ServiceConnectionProvider provider) {
        return new ResponseStatusException(
                HttpStatus.GONE,
                "Le service " + provider.name() + " n'est plus utilise. Le rendu video passe par Remotion."
        );
    }

    private ServiceConnectionValidationResult executeN8nHealthcheck(String baseUrl) {
        HttpURLConnection connection = null;
        try {
            URL url = URI.create(baseUrl + "/healthz").toURL();
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(15_000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Connection", "close");

            int statusCode = connection.getResponseCode();
            try (InputStream ignored = statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream()) {
                // Fully opening the stream is enough here; the healthcheck body is not required.
            }

            if (statusCode >= 200 && statusCode <= 299) {
                return new ServiceConnectionValidationResult(
                        ServiceConnectionValidationStatus.VALID,
                        providerMessage("n8n") + " a repondu " + statusCode + "."
                );
            }

            throw invalid(providerMessage("n8n"), statusCode, "");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de contacter n8n.", exception);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private List<String> n8nCandidateBaseUrls(String rawBaseUrl) {
        String normalized = stripTrailingSlash(rawBaseUrl);
        Set<String> candidates = new LinkedHashSet<>();
        if (!normalized.isBlank()) {
            candidates.add(normalized);
        }
        candidates.add("http://n8n:5678");
        candidates.add("http://host.docker.internal:5678");
        candidates.add("http://localhost:5678");
        return new ArrayList<>(candidates);
    }
}

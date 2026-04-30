package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
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
import java.util.Map;

@Service
public class SupabaseVideoOpsGateway {

    private final VideoOpsProperties properties;
    private final ServiceConnectionResolver connectionResolver;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public SupabaseVideoOpsGateway(VideoOpsProperties properties, ServiceConnectionResolver connectionResolver, ObjectMapper objectMapper) {
        this.properties = properties;
        this.connectionResolver = connectionResolver;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public JsonNode fetchContentIdeas() {
        ensureConfigured();
        String select = "id,category,topic,scripts,caption,background_keyword,shotstack_status,publish_status,final_video_status,shotstack_url,tiktok_upload_url,tiktok_upload_status,tiktok_account_open_id";
        String url = restBaseUrl() + "/content_ideas?select=" + encode(select) + "&order=id.desc&limit=" + properties.getQueryLimit();
        return sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build(), "Impossible de lire content_ideas depuis Supabase.");
    }

    public JsonNode fetchContentIdeaById(long contentIdeaId) {
        ensureConfigured();
        String select = "id,category,topic,scripts,caption,background_keyword,shotstack_status,publish_status,final_video_status,shotstack_url,tiktok_upload_url,tiktok_upload_status,tiktok_account_open_id";
        String url = restBaseUrl() + "/content_ideas?select=" + encode(select) + "&id=eq." + contentIdeaId + "&limit=1";
        return sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build(), "Impossible de lire la content_idea depuis Supabase.");
    }

    public JsonNode fetchInitPublishContentIdea(long contentIdeaId) {
        ensureConfigured();
        String select = "id,platform,caption,shotstack_url,final_video_status,publish_status,tiktok_account_open_id";
        String url = restBaseUrl() + "/content_ideas?select=" + encode(select) + "&id=eq." + contentIdeaId + "&limit=1";
        return sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build(), "Impossible de lire le contexte init publish depuis Supabase.");
    }

    public JsonNode fetchTikTokAccounts() {
        ensureConfigured();
        String select = "id,open_id,scope,token_type";
        String url = restBaseUrl() + "/tiktok_accounts?select=" + encode(select) + "&order=id.asc&limit=" + properties.getQueryLimit();
        return sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build(), "Impossible de lire tiktok_accounts depuis Supabase.");
    }

    public JsonNode fetchTikTokAccountsForEncryptionMigration() {
        ensureConfigured();
        String select = "id,open_id,access_token,refresh_token";
        String url = restBaseUrl() + "/tiktok_accounts?select=" + encode(select) + "&order=id.asc&limit=" + properties.getQueryLimit();
        return sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build(), "Impossible de lire tiktok_accounts pour la migration de chiffrement.");
    }

    public JsonNode findTikTokAccountsByOpenId(String openId) {
        ensureConfigured();
        String select = "id,open_id,scope,access_token,refresh_token,token_type";
        String url = restBaseUrl() + "/tiktok_accounts?select=" + encode(select) + "&open_id=eq." + encode(openId) + "&limit=1";
        return sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build(), "Impossible de lire le compte TikTok depuis Supabase.");
    }

    public JsonNode updateContentIdea(long contentIdeaId, Map<String, Object> payload) {
        ensureConfigured();
        String url = restBaseUrl() + "/content_ideas?id=eq." + contentIdeaId;
        try {
            String body = objectMapper.writeValueAsString(payload);
            return sendJsonRequest(HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Prefer", "return=representation")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(body))
                    .build(), "Impossible de mettre a jour content_ideas dans Supabase.");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de serialiser la mise a jour Supabase.", exception);
        }
    }

    public JsonNode createTikTokAccount(Map<String, Object> payload) {
        ensureConfigured();
        String url = restBaseUrl() + "/tiktok_accounts";
        try {
            String body = objectMapper.writeValueAsString(payload);
            return sendJsonRequest(HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Prefer", "return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build(), "Impossible de creer le compte TikTok dans Supabase.");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de serialiser la creation du compte TikTok.", exception);
        }
    }

    public JsonNode updateTikTokAccount(long accountId, Map<String, Object> payload) {
        ensureConfigured();
        String url = restBaseUrl() + "/tiktok_accounts?id=eq." + accountId;
        try {
            String body = objectMapper.writeValueAsString(payload);
            return sendJsonRequest(HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Prefer", "return=representation")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(body))
                    .build(), "Impossible de mettre a jour le compte TikTok dans Supabase.");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de serialiser la mise a jour du compte TikTok.", exception);
        }
    }

    public void deleteTikTokAccount(long accountId) {
        ensureConfigured();
        String url = restBaseUrl() + "/tiktok_accounts?id=eq." + accountId;
        sendJsonRequest(HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .method("DELETE", HttpRequest.BodyPublishers.noBody())
                .build(), "Impossible de supprimer le compte TikTok dans Supabase.");
    }

    private JsonNode sendJsonRequest(HttpRequest request, String fallbackMessage) {
        try {
            HttpRequest enrichedRequest = withSupabaseHeaders(request);
            HttpResponse<String> response = httpClient.send(enrichedRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        fallbackMessage + " Supabase a repondu " + response.statusCode() + "."
                );
            }
            String body = response.body();
            return body == null || body.isBlank() ? objectMapper.createArrayNode() : objectMapper.readTree(body);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, fallbackMessage, exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, fallbackMessage, exception);
        }
    }

    private HttpRequest withSupabaseHeaders(HttpRequest request) {
        String serviceRoleKey = currentSupabaseServiceRoleKey();
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(request.uri())
                .timeout(request.timeout().orElse(Duration.ofSeconds(30)))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("Content-Type", "application/json");
        request.headers().map().forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
        return builder.method(
                request.method(),
                request.bodyPublisher().orElse(HttpRequest.BodyPublishers.noBody())
        ).build();
    }

    private void ensureConfigured() {
        if (currentSupabaseUrl() == null || currentSupabaseUrl().isBlank()
                || currentSupabaseServiceRoleKey() == null || currentSupabaseServiceRoleKey().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "La configuration video ops backend vers Supabase est manquante."
            );
        }
    }

    private String restBaseUrl() {
        return currentSupabaseUrl().replaceAll("/+$", "") + "/rest/v1";
    }

    private String currentSupabaseUrl() {
        ResolvedServiceConnection connection = connectionResolver.findConnected(ServiceConnectionProvider.SUPABASE);
        if (connection != null && isSupabaseProjectUrl(connection.baseUrl())) {
            return connection.baseUrl();
        }
        return properties.getSupabaseUrl();
    }

    private String currentSupabaseServiceRoleKey() {
        ResolvedServiceConnection connection = connectionResolver.findConnected(ServiceConnectionProvider.SUPABASE);
        if (connection != null && isSupabaseProjectUrl(connection.baseUrl())
                && connection.secretValue() != null && !connection.secretValue().isBlank()) {
            return connection.secretValue();
        }
        return properties.getSupabaseServiceRoleKey();
    }

    private boolean isSupabaseProjectUrl(String rawUrl) {
        try {
            if (rawUrl == null || rawUrl.isBlank()) {
                return false;
            }
            URI uri = URI.create(rawUrl);
            String host = uri.getHost();
            return host != null && host.toLowerCase().endsWith(".supabase.co");
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

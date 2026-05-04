package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.ServiceConnection;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import com.tiktokapp.backend.repository.ServiceConnectionRepository;
import com.tiktokapp.backend.model.VideoWorkflowType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class N8nWorkflowGateway {

    private final ServiceConnectionRepository serviceConnectionRepository;
    private final ObjectMapper objectMapper;

    public N8nWorkflowGateway(ServiceConnectionRepository serviceConnectionRepository, ObjectMapper objectMapper) {
        this.serviceConnectionRepository = serviceConnectionRepository;
        this.objectMapper = objectMapper;
    }

    public JsonNode trigger(VideoWorkflowType workflowType, Map<String, Object> payload) {
        String webhookUrl = resolveWebhookUrl(workflowType);
        HttpURLConnection connection = null;
        try {
            byte[] requestBody = objectMapper.writeValueAsBytes(payload);
            URL url = URI.create(webhookUrl).toURL();
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(20_000);
            connection.setReadTimeout(60_000);
            connection.setDoOutput(true);
            connection.setFixedLengthStreamingMode(requestBody.length);
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Connection", "close");
            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(requestBody);
                outputStream.flush();
            }

            int statusCode = connection.getResponseCode();
            String body = readBody(statusCode >= 400 ? connection.getErrorStream() : connection.getInputStream());
            if (statusCode < 200 || statusCode >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "n8n a refuse le declenchement " + workflowType + " avec le statut " + statusCode + "."
                );
            }
            return body == null || body.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(body);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de contacter n8n pour " + workflowType + ".", exception);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String readBody(InputStream inputStream) throws IOException {
        if (inputStream == null) {
            return "";
        }
        try (InputStream stream = inputStream) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String resolveWebhookUrl(VideoWorkflowType workflowType) {
        ServiceConnection connection = serviceConnectionRepository
                .findFirstByProviderKeyAndActiveTrue(ServiceConnectionProvider.N8N)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Aucune connexion n8n active n'est configuree dans Accounts."
                ));

        String baseUrl = normalizeBaseUrl(connection.getBaseUrl());
        String path = resolveWebhookPath(connection.getMetadataJson(), workflowType);
        String url = baseUrl + path;

        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le webhook n8n pour " + workflowType + " n'est pas configure cote backend."
            );
        }

        return url;
    }

    private String normalizeBaseUrl(String baseUrl) {
        String normalized = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        if (normalized.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "La connexion n8n active n'a pas de baseUrl valide."
            );
        }
        return normalized;
    }

    private String resolveWebhookPath(String metadataJson, VideoWorkflowType workflowType) {
        String defaultPath = switch (workflowType) {
            case MAIN_PIPELINE -> "/webhook/fused-idea-script";
            case SCRIPT_GENERATION -> "/webhook/script-generation";
            case CHECK_SHOTSTACK -> "/webhook/check-shotstack";
            case RENDER_TEMPLATE_VIDEO -> "/webhook/render-template-video";
            case INIT_PUBLISH_TIKTOK -> "/webhook/init-publish-tiktok";
            default -> "";
        };

        if (metadataJson == null || metadataJson.isBlank()) {
            return defaultPath;
        }

        try {
            JsonNode metadata = objectMapper.readTree(metadataJson);
            String overridePath = switch (workflowType) {
                case MAIN_PIPELINE -> readWebhookPath(metadata, "mainPipeline");
                case SCRIPT_GENERATION -> readWebhookPath(metadata, "scriptGeneration");
                case CHECK_SHOTSTACK -> readWebhookPath(metadata, "checkShotstack");
                case RENDER_TEMPLATE_VIDEO -> readWebhookPath(metadata, "renderTemplateVideo");
                case INIT_PUBLISH_TIKTOK -> readWebhookPath(metadata, "initPublishTikTok");
                default -> null;
            };
            return overridePath == null || overridePath.isBlank() ? defaultPath : overridePath;
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le Metadata JSON de la connexion n8n active est invalide."
            );
        }
    }

    private String readWebhookPath(JsonNode metadata, String workflowKey) {
        JsonNode workflowPaths = metadata.path("workflowPaths");
        if (!workflowPaths.isObject()) {
            return null;
        }
        String value = workflowPaths.path(workflowKey).asText("");
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.startsWith("/") ? value : "/" + value;
    }
}

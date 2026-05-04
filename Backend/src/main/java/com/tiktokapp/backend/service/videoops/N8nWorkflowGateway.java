package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
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

    private final VideoOpsProperties properties;
    private final ObjectMapper objectMapper;

    public N8nWorkflowGateway(VideoOpsProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
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
        VideoOpsProperties.N8n cfg = properties.getN8n();
        String baseUrl = normalizeBaseUrl(cfg.getBaseUrl());
        String path = resolveWebhookPath(cfg, workflowType);
        return baseUrl + (path.startsWith("/") ? path : "/" + path);
    }

    private String normalizeBaseUrl(String baseUrl) {
        String normalized = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        if (normalized.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "L URL de base n8n n'est pas configuree (app.video-ops.n8n.base-url)."
            );
        }
        return normalized;
    }

    private String resolveWebhookPath(VideoOpsProperties.N8n cfg, VideoWorkflowType workflowType) {
        return switch (workflowType) {
            case MAIN_PIPELINE -> cfg.getMainPipelinePath();
            case CHECK_SHOTSTACK -> cfg.getCheckShotstackPath();
            case RENDER_TEMPLATE_VIDEO -> cfg.getRenderTemplateVideoPath();
            case INIT_PUBLISH_TIKTOK -> cfg.getInitPublishTikTokPath();
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Aucun webhook n8n configure pour " + workflowType + "."
            );
        };
    }
}

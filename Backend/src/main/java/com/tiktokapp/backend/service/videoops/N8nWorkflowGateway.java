package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final N8nWorkflowContractService workflowContractService;
    private final ObjectMapper objectMapper;

    public N8nWorkflowGateway(N8nWorkflowContractService workflowContractService, ObjectMapper objectMapper) {
        this.workflowContractService = workflowContractService;
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
        String workflowPathKey = switch (workflowType) {
            case MAIN_PIPELINE -> "mainPipeline";
            case CHECK_SHOTSTACK -> "checkShotstack";
            case RENDER_TEMPLATE_VIDEO -> "renderTemplateVideo";
            case INIT_PUBLISH_TIKTOK -> "initPublishTikTok";
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Aucun webhook n8n configure pour " + workflowType + "."
            );
        };
        return workflowContractService.requireWebhookUrl(workflowPathKey);
    }
}

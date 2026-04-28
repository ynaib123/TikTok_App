package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.model.VideoWorkflowType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Service
public class N8nWorkflowGateway {

    private final VideoOpsProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public N8nWorkflowGateway(VideoOpsProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public JsonNode trigger(VideoWorkflowType workflowType, Map<String, Object> payload) {
        String webhookUrl = resolveWebhookUrl(workflowType);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "n8n a refuse le declenchement " + workflowType + " avec le statut " + response.statusCode() + "."
                );
            }
            String body = response.body();
            return body == null || body.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(body);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "n8n ne repond pas pour " + workflowType + ".", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de contacter n8n pour " + workflowType + ".", exception);
        }
    }

    private String resolveWebhookUrl(VideoWorkflowType workflowType) {
        String url = switch (workflowType) {
            case MAIN_PIPELINE -> properties.getN8nMainPipelineWebhook();
            case CHECK_SHOTSTACK -> properties.getN8nCheckShotstackWebhook();
            case INIT_PUBLISH_TIKTOK -> properties.getN8nPublishTikTokWebhook();
            default -> "";
        };

        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le webhook n8n pour " + workflowType + " n'est pas configure cote backend."
            );
        }

        return url;
    }
}

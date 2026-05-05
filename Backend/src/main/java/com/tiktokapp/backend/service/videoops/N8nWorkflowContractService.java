package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.N8nWorkflowContractResponse;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class N8nWorkflowContractService {

    private static final String SOURCE_APPLICATION_PROPERTIES = "application_properties";
    private static final String SOURCE_SERVICE_CONNECTION = "service_connection";

    private final VideoOpsProperties properties;
    private final ServiceConnectionResolver serviceConnectionResolver;
    private final VideoWorkflowRunRepository workflowRunRepository;
    private final AlertingProperties alertingProperties;

    public N8nWorkflowContractService(
            VideoOpsProperties properties,
            ServiceConnectionResolver serviceConnectionResolver,
            VideoWorkflowRunRepository workflowRunRepository,
            AlertingProperties alertingProperties
    ) {
        this.properties = properties;
        this.serviceConnectionResolver = serviceConnectionResolver;
        this.workflowRunRepository = workflowRunRepository;
        this.alertingProperties = alertingProperties;
    }

    public ResolvedN8nWorkflowConfiguration resolveConfiguration() {
        VideoOpsProperties.N8n defaults = properties.getN8n();
        ResolvedServiceConnection connection = serviceConnectionResolver.findConnected(ServiceConnectionProvider.N8N);
        String source = connection == null ? SOURCE_APPLICATION_PROPERTIES : SOURCE_SERVICE_CONNECTION;
        JsonNode metadata = connection == null ? null : connection.metadata();
        JsonNode workflowPaths = metadata == null ? null : metadata.path("workflowPaths");

        Map<String, String> resolvedPaths = new LinkedHashMap<>();
        resolvedPaths.put("mainPipeline", firstNonBlank(readJsonText(workflowPaths, "mainPipeline"), defaults.getMainPipelinePath()));
        resolvedPaths.put("scriptGeneration", firstNonBlank(readJsonText(workflowPaths, "scriptGeneration"), defaults.getScriptGenerationPath()));
        resolvedPaths.put("renderTemplateVideo", firstNonBlank(readJsonText(workflowPaths, "renderTemplateVideo"), defaults.getRenderTemplateVideoPath()));
        resolvedPaths.put("checkShotstack", firstNonBlank(readJsonText(workflowPaths, "checkShotstack"), defaults.getCheckShotstackPath()));
        resolvedPaths.put("initPublishTikTok", firstNonBlank(readJsonText(workflowPaths, "initPublishTikTok"), defaults.getInitPublishTikTokPath()));

        String baseUrl = firstNonBlank(connection == null ? null : connection.baseUrl(), defaults.getBaseUrl());
        return new ResolvedN8nWorkflowConfiguration(source, trimToNull(baseUrl), resolvedPaths);
    }

    public N8nWorkflowContractResponse describeContract() {
        try {
            ResolvedN8nWorkflowConfiguration configuration = resolveConfiguration();
            List<String> warnings = new ArrayList<>();
            boolean healthy = true;

            if (trimToNull(configuration.baseUrl()) == null) {
                warnings.add("Base URL n8n manquante.");
                healthy = false;
            }

            for (String requiredKey : List.of("mainPipeline", "renderTemplateVideo", "checkShotstack", "initPublishTikTok")) {
                if (trimToNull(configuration.workflowPaths().get(requiredKey)) == null) {
                    warnings.add("Webhook n8n manquant: " + requiredKey + ".");
                    healthy = false;
                }
            }

            if (properties.isAllowLegacyWorkflowCallbackSecret()) {
                warnings.add("Le fallback du secret legacy de callback est encore active.");
            }

            long stuckRunCount = countStuckRuns();
            if (stuckRunCount > 0) {
                warnings.add(stuckRunCount + " workflow run(s) depassent le seuil de stuck-run.");
            }

            return new N8nWorkflowContractResponse(
                    healthy,
                    configuration.source(),
                    configuration.baseUrl(),
                    configuration.workflowPaths(),
                    warnings,
                    properties.isAllowLegacyWorkflowCallbackSecret(),
                    stuckRunCount
            );
        } catch (Exception exception) {
            return new N8nWorkflowContractResponse(
                    false,
                    SOURCE_APPLICATION_PROPERTIES,
                    trimToNull(properties.getN8n().getBaseUrl()),
                    Map.of(),
                    List.of("Impossible de resoudre le contrat n8n: " + exception.getMessage()),
                    properties.isAllowLegacyWorkflowCallbackSecret(),
                    countStuckRuns()
            );
        }
    }

    public String requireWebhookUrl(String workflowPathKey) {
        ResolvedN8nWorkflowConfiguration configuration = resolveConfiguration();
        String baseUrl = trimToNull(configuration.baseUrl());
        if (baseUrl == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "L URL de base n8n n'est pas configuree."
            );
        }
        String path = trimToNull(configuration.workflowPaths().get(workflowPathKey));
        if (path == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le webhook n8n " + workflowPathKey + " n'est pas configure."
            );
        }
        return normalizeBaseUrl(baseUrl) + (path.startsWith("/") ? path : "/" + path);
    }

    private long countStuckRuns() {
        Instant threshold = Instant.now().minus(Duration.ofSeconds(alertingProperties.getStuckRunThresholdSeconds()));
        return workflowRunRepository.findByStatusInAndCreatedAtBefore(
                List.of(VideoWorkflowRunStatus.PENDING, VideoWorkflowRunStatus.ACCEPTED),
                threshold
        ).size();
    }

    private String readJsonText(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode child = node.get(fieldName);
        return child == null || child.isNull() ? null : trimToNull(child.asText(null));
    }

    private String firstNonBlank(String primary, String fallback) {
        String first = trimToNull(primary);
        return first != null ? first : trimToNull(fallback);
    }

    private String normalizeBaseUrl(String baseUrl) {
        return baseUrl.trim().replaceAll("/+$", "");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

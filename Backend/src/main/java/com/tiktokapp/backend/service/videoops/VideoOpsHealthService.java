package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.VideoOpsHealthResponse;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class VideoOpsHealthService {

    private static final Logger logger = LoggerFactory.getLogger(VideoOpsHealthService.class);

    private final VideoOpsProperties videoOpsProperties;
    private final AlertingProperties alertingProperties;
    private final VideoWorkflowRunRepository workflowRunRepository;

    public VideoOpsHealthService(
            VideoOpsProperties videoOpsProperties,
            AlertingProperties alertingProperties,
            VideoWorkflowRunRepository workflowRunRepository
    ) {
        this.videoOpsProperties = videoOpsProperties;
        this.alertingProperties = alertingProperties;
        this.workflowRunRepository = workflowRunRepository;
    }

    public VideoOpsHealthResponse buildHealth() {
        VideoOpsHealthResponse.Component database = probeDatabase();
        VideoOpsHealthResponse.Component n8n = probeN8n();
        VideoOpsHealthResponse.Component alerting = probeAlerting();
        VideoOpsHealthResponse.WorkflowSummary workflows = buildWorkflowSummary();
        Map<String, Object> contract = buildContractSnapshot();

        String overall = "UP";
        if (!"UP".equals(database.status()) || !"UP".equals(n8n.status())) {
            overall = "DOWN";
        } else if (workflows.stuckRunsOlderThanThreshold() > 0) {
            overall = "DEGRADED";
        }

        return new VideoOpsHealthResponse(overall, database, n8n, alerting, workflows, contract);
    }

    private VideoOpsHealthResponse.Component probeDatabase() {
        long start = System.currentTimeMillis();
        try {
            workflowRunRepository.count();
            return new VideoOpsHealthResponse.Component("UP", "JPA repository reachable", System.currentTimeMillis() - start);
        } catch (RuntimeException ex) {
            logger.warn("video_ops health database probe failed: {}", ex.getMessage());
            return new VideoOpsHealthResponse.Component("DOWN", ex.getClass().getSimpleName() + ": " + ex.getMessage(), System.currentTimeMillis() - start);
        }
    }

    private VideoOpsHealthResponse.Component probeN8n() {
        VideoOpsProperties.N8n cfg = videoOpsProperties.getN8n();
        String baseUrl = cfg.getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return new VideoOpsHealthResponse.Component("DOWN", "n8n base URL not configured", null);
        }
        long start = System.currentTimeMillis();
        HttpURLConnection connection = null;
        try {
            URL url = URI.create(baseUrl + "/healthz").toURL();
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(2_000);
            connection.setReadTimeout(2_000);
            int code = connection.getResponseCode();
            long latency = System.currentTimeMillis() - start;
            if (code >= 200 && code < 500) {
                return new VideoOpsHealthResponse.Component("UP", "n8n " + baseUrl + " HTTP " + code, latency);
            }
            return new VideoOpsHealthResponse.Component("DOWN", "n8n " + baseUrl + " HTTP " + code, latency);
        } catch (IOException ex) {
            logger.warn("video_ops health n8n probe failed: {}", ex.getMessage());
            return new VideoOpsHealthResponse.Component("DOWN", ex.getClass().getSimpleName() + ": " + ex.getMessage(), System.currentTimeMillis() - start);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private VideoOpsHealthResponse.Component probeAlerting() {
        if (!alertingProperties.isEnabled()) {
            return new VideoOpsHealthResponse.Component("DISABLED", "Alerting disabled in config", null);
        }
        boolean slackConfigured = alertingProperties.getSlackWebhookUrl() != null && !alertingProperties.getSlackWebhookUrl().isBlank();
        return new VideoOpsHealthResponse.Component(
                slackConfigured ? "UP" : "DEGRADED",
                slackConfigured ? "Slack webhook configured" : "Alerting enabled but no Slack webhook configured",
                null
        );
    }

    private VideoOpsHealthResponse.WorkflowSummary buildWorkflowSummary() {
        Instant threshold = Instant.now().minus(Duration.ofSeconds(alertingProperties.getStuckRunThresholdSeconds()));
        List<VideoWorkflowRun> stuck = workflowRunRepository.findByStatusInAndCreatedAtBefore(
                List.of(VideoWorkflowRunStatus.PENDING, VideoWorkflowRunStatus.ACCEPTED),
                threshold
        );
        List<VideoWorkflowRun> recentFailed = workflowRunRepository.findTop8ByStatusOrderByCreatedAtDesc(VideoWorkflowRunStatus.FAILED);
        List<String> recentFailures = recentFailed.stream()
                .map(run -> "run=" + run.getId()
                        + " type=" + (run.getWorkflowType() == null ? "?" : run.getWorkflowType().name())
                        + " ideaId=" + run.getContentIdeaId()
                        + " err=" + (run.getErrorMessage() == null ? "" : run.getErrorMessage()))
                .collect(Collectors.toList());
        return new VideoOpsHealthResponse.WorkflowSummary(
                stuck.size(),
                (int) alertingProperties.getStuckRunThresholdSeconds(),
                recentFailures
        );
    }

    private Map<String, Object> buildContractSnapshot() {
        VideoOpsProperties.N8n cfg = videoOpsProperties.getN8n();
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("baseUrl", cfg.getBaseUrl());
        contract.put("mainPipelinePath", cfg.getMainPipelinePath());
        contract.put("renderTemplateVideoPath", cfg.getRenderTemplateVideoPath());
        contract.put("checkShotstackPath", cfg.getCheckShotstackPath());
        contract.put("initPublishTikTokPath", cfg.getInitPublishTikTokPath());
        contract.put("idempotencyWindowSeconds", videoOpsProperties.getIdempotencyWindowSeconds());
        contract.put("legacyCallbackSecretAllowed", videoOpsProperties.isAllowLegacyWorkflowCallbackSecret());
        return contract;
    }
}

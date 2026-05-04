package com.tiktokapp.backend.service.alerting;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.model.AlertCooldown;
import com.tiktokapp.backend.repository.AlertCooldownRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SlackAlertService {

    private static final Logger logger = LoggerFactory.getLogger(SlackAlertService.class);

    private static final String COLOR_CRITICAL = "#ef4444";
    private static final String COLOR_WARNING = "#f59e0b";
    private static final String ICON_CRITICAL = ":red_circle:";
    private static final String ICON_WARNING = ":warning:";
    private static final String RATE_LIMIT_KEY = "__global_rate_limit_digest__";

    private final AlertingProperties properties;
    private final AlertCooldownRepository cooldownRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public SlackAlertService(
            AlertingProperties properties,
            AlertCooldownRepository cooldownRepository,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.cooldownRepository = cooldownRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public enum Severity {
        CRITICAL,
        WARNING
    }

    public record AlertNotification(
            String workflowType,
            String runId,
            String contentIdeaId,
            String errorMessage,
            String node,
            int attempt,
            int maxAttempts,
            Severity severity,
            boolean isFatal,
            String n8nUrl
    ) {}

    @Transactional
    public AlertResult notify(AlertNotification alert) {
        if (!properties.isEnabled()) {
            return AlertResult.skipped("alerting_disabled");
        }
        String webhook = properties.getSlackWebhookUrl();
        if (webhook == null || webhook.isBlank()) {
            logger.warn("Slack webhook url not configured; skipping alert {}/{}", alert.workflowType(), alert.runId());
            return AlertResult.skipped("webhook_not_configured");
        }

        String alertKey = buildAlertKey(alert);
        Instant now = Instant.now();
        Instant cooldownThreshold = now.minusSeconds(properties.getCooldownSeconds());

        Optional<AlertCooldown> existing = cooldownRepository.findByAlertKey(alertKey);
        if (existing.isPresent() && existing.get().getLastSentAt().isAfter(cooldownThreshold)) {
            AlertCooldown cd = existing.get();
            cd.setAlertCount(cd.getAlertCount() + 1);
            cooldownRepository.save(cd);
            logger.debug("Alert suppressed by cooldown alert_key={}", alertKey);
            return AlertResult.skipped("cooldown");
        }

        Instant rateWindow = now.minusSeconds(properties.getRateLimitWindowSeconds());
        long recent = cooldownRepository.countByLastSentAtAfter(rateWindow);
        if (recent >= properties.getRateLimitMaxAlerts()) {
            sendDigestIfNeeded(webhook, recent, now);
            recordCooldown(alertKey, now, alert.errorMessage(), existing);
            return AlertResult.skipped("rate_limited");
        }

        try {
            String payload = buildSlackPayload(alert);
            postToSlack(webhook, payload);
            recordCooldown(alertKey, now, alert.errorMessage(), existing);
            return AlertResult.sent(alertKey);
        } catch (Exception e) {
            logger.error("Failed to send Slack alert for {}/{}", alert.workflowType(), alert.runId(), e);
            return AlertResult.failed(e.getMessage());
        }
    }

    private void sendDigestIfNeeded(String webhook, long recent, Instant now) {
        Optional<AlertCooldown> digest = cooldownRepository.findByAlertKey(RATE_LIMIT_KEY);
        Instant cooldownThreshold = now.minusSeconds(properties.getCooldownSeconds());
        if (digest.isPresent() && digest.get().getLastSentAt().isAfter(cooldownThreshold)) {
            return;
        }
        try {
            String text = String.format(
                    ":warning: *Alert flood detected* — %d alerts in last %d seconds. Individual alerts suppressed; check n8n.",
                    recent, properties.getRateLimitWindowSeconds()
            );
            String payload = objectMapper.writeValueAsString(Map.of(
                    "attachments", List.of(Map.of(
                            "color", COLOR_WARNING,
                            "blocks", List.of(Map.of(
                                    "type", "section",
                                    "text", Map.of("type", "mrkdwn", "text", text)
                            ))
                    ))
            ));
            postToSlack(webhook, payload);
            recordCooldown(RATE_LIMIT_KEY, now, null, digest);
        } catch (Exception e) {
            logger.error("Failed to send rate-limit digest", e);
        }
    }

    private void recordCooldown(String key, Instant now, String errorMessage, Optional<AlertCooldown> existing) {
        AlertCooldown cd = existing.orElseGet(AlertCooldown::new);
        if (cd.getId() == null) {
            cd.setAlertKey(key);
            cd.setAlertCount(1);
        } else {
            cd.setAlertCount(cd.getAlertCount() + 1);
        }
        cd.setLastSentAt(now);
        cd.setLastErrorHash(hashErrorMessage(errorMessage));
        try {
            cooldownRepository.save(cd);
        } catch (DataIntegrityViolationException e) {
            logger.debug("Cooldown row created concurrently for {}", key);
        }
    }

    private String buildAlertKey(AlertNotification alert) {
        String wf = alert.workflowType() == null ? "unknown" : alert.workflowType();
        String idea = alert.contentIdeaId() == null ? "_" : alert.contentIdeaId();
        String errorHash = hashErrorMessage(alert.errorMessage());
        String key = wf + ":" + idea + ":" + (errorHash == null ? "_" : errorHash.substring(0, Math.min(16, errorHash.length())));
        return key.length() > 250 ? key.substring(0, 250) : key;
    }

    private String hashErrorMessage(String error) {
        if (error == null || error.isBlank()) {
            return null;
        }
        try {
            String normalized = error.toLowerCase().replaceAll("\\d+", "#").trim();
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(normalized.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(error.hashCode());
        }
    }

    private String buildSlackPayload(AlertNotification alert) throws JsonProcessingException {
        boolean critical = alert.severity() == Severity.CRITICAL;
        String color = critical ? COLOR_CRITICAL : COLOR_WARNING;
        String icon = critical ? ICON_CRITICAL : ICON_WARNING;
        String header = critical
                ? icon + " Workflow échoué — " + nullSafe(alert.workflowType())
                : icon + " Warning — " + nullSafe(alert.workflowType());

        Map<String, Object> headerSection = Map.of(
                "type", "section",
                "text", Map.of("type", "mrkdwn", "text", "*" + header + "*")
        );

        Map<String, Object> fieldsSection = new LinkedHashMap<>();
        fieldsSection.put("type", "section");
        fieldsSection.put("fields", List.of(
                Map.of("type", "mrkdwn", "text", "*Workflow*\n" + nullSafe(alert.workflowType())),
                Map.of("type", "mrkdwn", "text", "*Run ID*\n#" + nullSafe(alert.runId())),
                Map.of("type", "mrkdwn", "text", "*ContentIdea*\n" + (alert.contentIdeaId() == null ? "—" : "#" + alert.contentIdeaId())),
                Map.of("type", "mrkdwn", "text", "*Erreur*\n" + truncate(nullSafe(alert.errorMessage()), 300)),
                Map.of("type", "mrkdwn", "text", "*Tentatives*\n" + alert.attempt() + " / " + alert.maxAttempts()),
                Map.of("type", "mrkdwn", "text", "*Heure*\n" + Instant.now().toString())
        ));

        String contextText = "Node: *" + nullSafe(alert.node()) + "*"
                + (alert.n8nUrl() != null && !alert.n8nUrl().isBlank()
                ? " | <" + alert.n8nUrl() + "|Voir dans n8n>"
                : "");
        Map<String, Object> contextSection = Map.of(
                "type", "context",
                "elements", List.of(Map.of("type", "mrkdwn", "text", contextText))
        );

        Map<String, Object> attachment = Map.of(
                "color", color,
                "blocks", List.of(headerSection, fieldsSection, contextSection)
        );
        return objectMapper.writeValueAsString(Map.of("attachments", List.of(attachment)));
    }

    private void postToSlack(String webhook, String payload) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(webhook))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Slack webhook returned " + response.statusCode() + ": " + response.body());
        }
    }

    private String nullSafe(String s) {
        return s == null ? "—" : s;
    }

    private String truncate(String s, int max) {
        if (s == null) return "—";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    public record AlertResult(String status, String detail) {
        public static AlertResult sent(String key) { return new AlertResult("sent", key); }
        public static AlertResult skipped(String reason) { return new AlertResult("skipped", reason); }
        public static AlertResult failed(String reason) { return new AlertResult("failed", reason); }
    }
}

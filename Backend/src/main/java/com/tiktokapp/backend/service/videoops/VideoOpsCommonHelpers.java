package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import org.slf4j.Logger;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Pure helpers shared between the four extracted videoops services.
 * Stateless, side-effect-free except for the logger calls.
 */
public final class VideoOpsCommonHelpers {

    private VideoOpsCommonHelpers() {}

    public static String text(JsonNode row, String fieldName, String fallback) {
        String value = row.path(fieldName).asText("");
        return value == null || value.isBlank() ? fallback : value;
    }

    public static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    public static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }

    public static String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    public static String json(ObjectMapper objectMapper, Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{\"error\":\"serialization_failed\"}";
        }
    }

    public static Map<String, Object> payloadOf(String key, Object value) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put(key, value == null ? "" : value);
        return payload;
    }

    public static void logWorkflowInfo(Logger logger, String eventType, VideoWorkflowRun run, String message) {
        logger.info(
                "video_ops event={} workflowRunId={} contentIdeaId={} workflowType={} attemptNumber={} status={} message={}",
                eventType,
                run == null ? null : run.getId(),
                run == null ? null : run.getContentIdeaId(),
                run == null || run.getWorkflowType() == null ? null : run.getWorkflowType().name(),
                run == null ? null : run.getAttemptNumber(),
                run == null || run.getStatus() == null ? null : run.getStatus().name(),
                message
        );
    }

    public static void logWorkflowWarn(Logger logger, String eventType, VideoWorkflowRun run, String message) {
        logger.warn(
                "video_ops event={} workflowRunId={} contentIdeaId={} workflowType={} attemptNumber={} status={} message={}",
                eventType,
                run == null ? null : run.getId(),
                run == null ? null : run.getContentIdeaId(),
                run == null || run.getWorkflowType() == null ? null : run.getWorkflowType().name(),
                run == null ? null : run.getAttemptNumber(),
                run == null || run.getStatus() == null ? null : run.getStatus().name(),
                message
        );
    }
}

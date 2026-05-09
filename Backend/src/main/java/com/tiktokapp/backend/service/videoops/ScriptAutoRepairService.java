package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.llm.AnthropicProperties;
import com.tiktokapp.backend.ai.llm.LlmProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Lot 7 / H2 — single-shot auto-repair for malformed scripts coming back from n8n.
 *
 * <p>Two-step pipeline :
 * <ol>
 *   <li>{@link #validate} runs a fast structural check against the expected
 *       JSON shape (an array of objects with at least {@code text} and
 *       {@code durationSec}).</li>
 *   <li>If the script is invalid <em>and</em> the feature flag
 *       {@code app.ai.script-repair.enabled} is on, {@link #repair} asks Claude
 *       to rewrite the offending payload into a valid version, returning the
 *       repaired JSON. The caller decides whether to swap the bad payload.</li>
 * </ol>
 *
 * <p>The seam is intentionally synchronous : when called inline before
 * triggering a render, a 5–10 s repair latency is cheap compared to the
 * cost of a failed render.
 */
@Service
public class ScriptAutoRepairService {

    private static final Logger logger = LoggerFactory.getLogger(ScriptAutoRepairService.class);

    private final ObjectMapper objectMapper;
    private final LlmProvider llmProvider;
    private final AnthropicProperties anthropicProperties;
    private final boolean featureFlagOn;

    public ScriptAutoRepairService(
            ObjectMapper objectMapper,
            LlmProvider llmProvider,
            AnthropicProperties anthropicProperties,
            @Value("${app.ai.script-repair.enabled:false}") boolean featureFlagOn
    ) {
        this.objectMapper = objectMapper;
        this.llmProvider = llmProvider;
        this.anthropicProperties = anthropicProperties;
        this.featureFlagOn = featureFlagOn;
    }

    public ValidationResult validate(String rawScript) {
        if (rawScript == null || rawScript.isBlank()) {
            return ValidationResult.invalid("script is empty");
        }
        try {
            JsonNode parsed = objectMapper.readTree(rawScript);
            if (!parsed.isArray()) {
                return ValidationResult.invalid("expected JSON array of scenes, got " + parsed.getNodeType());
            }
            if (parsed.isEmpty()) {
                return ValidationResult.invalid("scenes array is empty");
            }
            for (int i = 0; i < parsed.size(); i++) {
                JsonNode scene = parsed.get(i);
                if (!scene.isObject()) {
                    return ValidationResult.invalid("scene " + i + " is not an object");
                }
                if (!scene.has("text") || !scene.path("text").isTextual()) {
                    return ValidationResult.invalid("scene " + i + " missing text field");
                }
                JsonNode duration = scene.path("durationSec");
                if (!duration.isNumber() || duration.asDouble() <= 0) {
                    return ValidationResult.invalid("scene " + i + " missing/invalid durationSec");
                }
            }
            return ValidationResult.validResult();
        } catch (JsonProcessingException ex) {
            return ValidationResult.invalid("invalid JSON: " + ex.getOriginalMessage());
        }
    }

    /**
     * Best-effort repair via the LLM. Returns the original payload if the
     * feature flag is off, the provider is disabled, or the repair fails —
     * never throws so the caller can choose to fall back to the legacy script.
     */
    public RepairResult repair(String rawScript, String reason) {
        if (!featureFlagOn) {
            return RepairResult.skipped("feature flag off");
        }
        if (!llmProvider.isEnabled()) {
            return RepairResult.skipped("llm provider disabled");
        }
        String systemPrompt = """
                You repair malformed TikTok scene scripts.

                INPUT : a string that should be a JSON array of scene objects with the
                shape { "text": string, "durationSec": number }. The input is likely
                truncated, double-escaped, missing fields or wrapped in markdown.

                OUTPUT : a single JSON array, no prose, no markdown fences, no comments.
                Preserve every original sentence as-is when extracting them, and assign
                a reasonable durationSec (3–7 seconds) when missing.
                """;
        ObjectNode userMessage = objectMapper.createObjectNode();
        userMessage.put("role", "user");
        ArrayNode content = userMessage.putArray("content");
        ObjectNode block = content.addObject();
        block.put("type", "text");
        block.put("text",
                "Reason: " + reason + "\n\n"
                        + "Malformed script payload:\n```\n" + safeTruncate(rawScript, 6000) + "\n```\n\n"
                        + "Return only the repaired JSON array.");
        try {
            LlmProvider.LlmResponse response = llmProvider.send(new LlmProvider.LlmRequest(
                    anthropicProperties.getDefaultModelId(),
                    systemPrompt,
                    List.of(userMessage),
                    List.of(),
                    Math.min(2_048, anthropicProperties.getMaxTokens())
            ));
            String repaired = extractJsonArray(response.messageJson());
            if (repaired == null) {
                return RepairResult.failed("LLM did not return a JSON array");
            }
            ValidationResult check = validate(repaired);
            if (!check.ok()) {
                return RepairResult.failed("repair output still invalid: " + check.reason());
            }
            logger.info("script_auto_repair tokensIn={} tokensOut={} reason='{}'",
                    response.inputTokens(), response.outputTokens(), reason);
            return RepairResult.repaired(repaired, response.inputTokens(), response.outputTokens());
        } catch (RuntimeException ex) {
            logger.warn("script_auto_repair failed reason='{}' cause={}", reason, ex.getMessage());
            return RepairResult.failed(ex.getMessage());
        }
    }

    private String extractJsonArray(JsonNode messageJson) {
        JsonNode contentArr = messageJson.path("content");
        if (!contentArr.isArray()) return null;
        for (JsonNode block : contentArr) {
            if (!"text".equals(block.path("type").asText())) continue;
            String text = block.path("text").asText("");
            String trimmed = text.trim();
            if (trimmed.startsWith("```")) {
                int firstNewline = trimmed.indexOf('\n');
                int closingFence = trimmed.lastIndexOf("```");
                if (firstNewline > 0 && closingFence > firstNewline) {
                    trimmed = trimmed.substring(firstNewline + 1, closingFence).trim();
                }
            }
            if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                return trimmed;
            }
        }
        return null;
    }

    private String safeTruncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max) + " ...[truncated]";
    }

    public record ValidationResult(boolean valid, String reason) {
        public boolean ok() { return valid; }
        public static ValidationResult validResult() { return new ValidationResult(true, null); }
        public static ValidationResult invalid(String reason) { return new ValidationResult(false, reason); }
    }

    public record RepairResult(Status status, String repairedScript, String reason, int tokensIn, int tokensOut) {
        public enum Status { REPAIRED, SKIPPED, FAILED }
        public static RepairResult repaired(String script, int in, int out) {
            return new RepairResult(Status.REPAIRED, script, null, in, out);
        }
        public static RepairResult skipped(String reason) {
            return new RepairResult(Status.SKIPPED, null, reason, 0, 0);
        }
        public static RepairResult failed(String reason) {
            return new RepairResult(Status.FAILED, null, reason, 0, 0);
        }
    }
}

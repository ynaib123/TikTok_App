package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.LlmScriptNormalizeRequest;
import com.tiktokapp.backend.dto.videoops.LlmScriptNormalizeResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Normalise la réponse LLM (script TikTok) produite par Groq.
 * Cette logique était auparavant inline dans le nœud n8n "Parse Script Response"
 * (148 lignes JS). La déplacer ici permet de la tester unitairement et de
 * supprimer la dépendance aux appels HTTP low-level depuis n8n.
 *
 * Le nœud n8n se simplifie à un HTTP Request vers:
 *   POST /api/video-ops/internal/llm/normalize-script
 */
@Service
public class LlmScriptNormalizationService {

    private static final Logger log = LoggerFactory.getLogger(LlmScriptNormalizationService.class);
    private static final int MIN_QA_SCORE = 70;
    private static final int QA_REPAIR_THRESHOLD = 75;
    private static final Pattern MARKDOWN_FENCE = Pattern.compile("^```json\\s*|^```|```$", Pattern.MULTILINE);

    private final ObjectMapper objectMapper;
    private final VideoOpsInternalProxyService proxyService;

    public LlmScriptNormalizationService(ObjectMapper objectMapper, VideoOpsInternalProxyService proxyService) {
        this.objectMapper = objectMapper;
        this.proxyService = proxyService;
    }

    public LlmScriptNormalizeResponse normalize(LlmScriptNormalizeRequest request) {
        int expectedSceneCount = Math.min(10, Math.max(1, request.expectedSceneCount()));

        ParsedPackage pkg = parseAndNormalize(request.rawLlmContent(), expectedSceneCount, request);

        // QA check : tenter une réparation si le score est insuffisant
        boolean repaired = false;
        String repairReason = null;

        if (!sceneCountOk(pkg, expectedSceneCount)) {
            repairReason = "scene_count_mismatch expected " + expectedSceneCount + " got " + pkg.scenes().size();
        } else if (qaScore(pkg) < QA_REPAIR_THRESHOLD) {
            repairReason = "qa_score_too_low " + qaScore(pkg);
        }

        if (repairReason != null) {
            log.info("LLM script repair triggered: {}", repairReason);
            pkg = repairViaGroq(pkg, repairReason, expectedSceneCount, request);
            repaired = true;
        }

        if (!sceneCountOk(pkg, expectedSceneCount)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "LLM_SCENE_COUNT_MISMATCH_AFTER_REPAIR: expected " + expectedSceneCount + ", got " + pkg.scenes().size());
        }
        if (qaScore(pkg) < MIN_QA_SCORE) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "LLM_QA_SCORE_TOO_LOW_AFTER_REPAIR: " + qaScore(pkg));
        }

        String script = pkg.scenes().stream()
                .map(s -> normalizeSentence(s.sceneText()))
                .reduce("", (a, b) -> a.isEmpty() ? b : a + " " + b);
        String backgroundKeyword = !pkg.backgroundKeyword().isBlank()
                ? pkg.backgroundKeyword()
                : pkg.scenes().isEmpty() ? request.topic() : pkg.scenes().get(0).visualKeyword();

        if (script.isBlank()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "LLM_MISSING_FIELD: script");
        if (pkg.caption().isBlank()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "LLM_MISSING_FIELD: caption");
        if (pkg.hook().isBlank()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "LLM_MISSING_FIELD: hook");

        var qualityReview = new LlmScriptNormalizeResponse.QualityReview(
                pkg.qaScore(),
                pkg.qaIssues(),
                pkg.languageOk(),
                pkg.sceneCountOk(),
                repaired,
                repairReason
        );

        return new LlmScriptNormalizeResponse(
                script,
                pkg.caption(),
                pkg.hook(),
                backgroundKeyword,
                pkg.scenes(),
                qualityReview,
                expectedSceneCount,
                request.contentIdeaId(),
                request.workflowRunId()
        );
    }

    // --- Parsing ---

    private ParsedPackage parseAndNormalize(String rawContent, int expectedSceneCount, LlmScriptNormalizeRequest req) {
        String cleaned = MARKDOWN_FENCE.matcher(rawContent.trim()).replaceAll("").trim();
        try {
            JsonNode parsed = objectMapper.readTree(cleaned);
            return buildPackage(parsed, expectedSceneCount, req);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "LLM_SCRIPT_PARSE_ERROR: " + e.getMessage());
        }
    }

    private ParsedPackage buildPackage(JsonNode parsed, int expectedSceneCount, LlmScriptNormalizeRequest req) {
        List<LlmScriptNormalizeResponse.NormalizedScene> scenes = new ArrayList<>();

        if (parsed.hasNonNull("scenes") && parsed.get("scenes").isArray()) {
            for (JsonNode scene : parsed.get("scenes")) {
                scenes.add(normalizeScene(scene, scenes.size(), req));
            }
        } else {
            // Fallback: split script into scenes
            String rawScript = parsed.path("script").asText("");
            List<String> parts = sentenceSplit(rawScript);
            for (int i = 0; i < parts.size(); i++) {
                scenes.add(new LlmScriptNormalizeResponse.NormalizedScene(
                        parts.get(i),
                        req.topic() != null ? req.topic() : "professional",
                        i == 0 ? "close-up dramatic" : "dynamic vertical",
                        i == 0 ? "hook" : "body"
                ));
            }
        }
        scenes = scenes.stream().filter(s -> !s.sceneText().isBlank()).toList();

        // QA review
        JsonNode qa = parsed.path("qualityReview");
        int score = qa.isMissingNode() ? 0 : qa.path("score").asInt(0);
        List<String> issues = qa.isMissingNode() ? List.of("missing_quality_review") : List.of();
        Boolean languageOk = qa.isMissingNode() ? null : qa.path("languageOk").asBoolean();
        Boolean sceneCountOk = qa.isMissingNode() ? null : (scenes.size() == expectedSceneCount);

        String backgroundKeyword = parsed.path("background_keyword").asText(
                parsed.path("backgroundKeyword").asText(
                        scenes.isEmpty() ? "" : scenes.get(0).visualKeyword()
                ));

        return new ParsedPackage(
                scenes,
                parsed.path("caption").asText(""),
                parsed.path("hook").asText(""),
                backgroundKeyword,
                score,
                new ArrayList<>(issues),
                languageOk,
                sceneCountOk
        );
    }

    private LlmScriptNormalizeResponse.NormalizedScene normalizeScene(JsonNode scene, int index, LlmScriptNormalizeRequest req) {
        String sceneText = scene.path("sceneText").asText(
                scene.path("text").asText(
                        scene.path("script").asText(""))).trim();
        String visualKeyword = scene.path("visualKeyword").asText(
                scene.path("mediaQuery").asText(
                        scene.path("keyword").asText(req.topic() != null ? req.topic() : "professional"))).trim();
        String cameraMood = scene.path("cameraMood").asText(
                scene.path("mood").asText(index == 0 ? "close-up dramatic" : "dynamic vertical")).trim();
        String overlayPriority = scene.path("overlayPriority").asText(
                scene.path("priority").asText(index == 0 ? "hook" : "body")).trim();
        return new LlmScriptNormalizeResponse.NormalizedScene(sceneText, visualKeyword, cameraMood, overlayPriority);
    }

    private ParsedPackage repairViaGroq(ParsedPackage pkg, String reason, int expectedSceneCount, LlmScriptNormalizeRequest req) {
        try {
            String repairPrompt = "Repair this TikTok package. Reason: " + reason
                    + "\nExpected scene count: " + expectedSceneCount
                    + "\nTopic: " + req.topic()
                    + "\nRules: scenes MUST contain exactly " + expectedSceneCount
                    + " objects. qualityReview.score must be >= 80 after repair."
                    + "\n\nPackage to repair:\n"
                    + objectMapper.writeValueAsString(pkgToNode(pkg));

            JsonNode repairRequest = objectMapper.createObjectNode()
                    .<com.fasterxml.jackson.databind.node.ObjectNode>put("model", "llama-3.3-70b-versatile")
                    .put("temperature", 0.35)
                    .put("max_tokens", 1100)
                    .set("messages", objectMapper.createArrayNode()
                            .add(objectMapper.createObjectNode()
                                    .put("role", "system")
                                    .put("content", "You are a strict TikTok storyboard QA. Return ONLY valid JSON without markdown."))
                            .add(objectMapper.createObjectNode()
                                    .put("role", "user")
                                    .put("content", repairPrompt)));

            JsonNode repairResponse = proxyService.proxyGroqChatCompletions(repairRequest);
            String repairContent = repairResponse.path("choices").path(0).path("message").path("content").asText("");
            return parseAndNormalize(repairContent, expectedSceneCount, req);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "LLM_REPAIR_FAILED: " + e.getMessage());
        }
    }

    // --- Helpers ---

    private boolean sceneCountOk(ParsedPackage pkg, int expected) {
        return pkg.scenes().size() == expected;
    }

    private int qaScore(ParsedPackage pkg) {
        return pkg.qaScore();
    }

    private static List<String> sentenceSplit(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split("(?<=[.!?])\\s+"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    private static String normalizeSentence(String text) {
        if (text == null || text.isBlank()) return "";
        String t = text.trim();
        return t.matches(".*[.!?]$") ? t : t + ".";
    }

    private JsonNode pkgToNode(ParsedPackage pkg) throws Exception {
        return objectMapper.valueToTree(pkg);
    }

    private record ParsedPackage(
            List<LlmScriptNormalizeResponse.NormalizedScene> scenes,
            String caption,
            String hook,
            String backgroundKeyword,
            int qaScore,
            List<String> qaIssues,
            Boolean languageOk,
            Boolean sceneCountOk
    ) {}
}

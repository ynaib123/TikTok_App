package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.model.ContentIdea;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Orchestre SceneBuilder + Pexels multi-clips et assemble un payload conforme
 * à `render-video-job.schema.json` v1.1.0 (avec `assets.scenes`).
 */
@Service
public class MultiSceneJobBuilderService {

    public static final String CONTRACT_VERSION = "1.1.0";
    public static final String DEFAULT_TEMPLATE_ID = "tiktok-scene-sequence";

    private final SceneBuilderService sceneBuilder;
    private final PexelsMultiSearchService pexelsMulti;
    private final ObjectMapper objectMapper;

    public MultiSceneJobBuilderService(
            SceneBuilderService sceneBuilder,
            PexelsMultiSearchService pexelsMulti,
            ObjectMapper objectMapper
    ) {
        this.sceneBuilder = sceneBuilder;
        this.pexelsMulti = pexelsMulti;
        this.objectMapper = objectMapper;
    }

    public record BuildOptions(
            long workflowRunId,
            String source,
            String templateId,
            int width,
            int height,
            int fps,
            double durationSec,
            String qualityProfile,
            String captionMode,
            String hook,
            String cta
    ) {
        public static BuildOptions defaults(long workflowRunId, String source) {
            return new BuildOptions(
                    workflowRunId,
                    source,
                    DEFAULT_TEMPLATE_ID,
                    1080,
                    1920,
                    30,
                    12.0,
                    "high",
                    "none",
                    null,
                    null
            );
        }
    }

    public BuildResult build(ContentIdea idea, BuildOptions options) {
        if (idea == null) {
            throw new IllegalArgumentException("ContentIdea required");
        }
        BuildOptions effective = options == null ? BuildOptions.defaults(0, "build-test") : options;

        List<SceneBuilderService.SceneSpec> specs = buildSceneSpecs(idea, effective.durationSec());
        if (specs.isEmpty()) {
            throw new IllegalStateException("Aucune scène extractible du script — script vide ou invalide.");
        }

        List<String> queries = specs.stream().map(SceneBuilderService.SceneSpec::mediaQuery).toList();
        List<Optional<PexelsMultiSearchService.MediaPick>> picks = pexelsMulti.fetchForQueries(queries);

        // Validation: il faut au moins un media réussi pour pouvoir rendre la vidéo.
        boolean anyMedia = picks.stream().anyMatch(Optional::isPresent);
        if (!anyMedia) {
            throw new IllegalStateException("Aucun clip Pexels trouvé pour aucune des scènes.");
        }

        ObjectNode job = assemble(idea, specs, picks, effective);
        return new BuildResult(job, specs, picks);
    }

    public record BuildResult(
            ObjectNode renderJob,
            List<SceneBuilderService.SceneSpec> sceneSpecs,
            List<Optional<PexelsMultiSearchService.MediaPick>> mediaPicks
    ) {}

    private ObjectNode assemble(
            ContentIdea idea,
            List<SceneBuilderService.SceneSpec> specs,
            List<Optional<PexelsMultiSearchService.MediaPick>> picks,
            BuildOptions opts
    ) {
        ObjectNode job = objectMapper.createObjectNode();
        job.put("contractVersion", CONTRACT_VERSION);
        job.put("workflowRunId", opts.workflowRunId());
        job.put("contentIdeaId", idea.getId() == null ? 0L : idea.getId());
        job.put("source", opts.source());
        job.put("requestedAt", Instant.now().toString());

        ObjectNode ideaNode = job.putObject("idea");
        putNullable(ideaNode, "category", truncate(idea.getCategory(), 120));
        ideaNode.put("topic", truncate(nullSafe(idea.getTopic(), "Video TikTok"), 240));
        putNullable(ideaNode, "hook", truncate(opts.hook(), 140));
        ideaNode.put("script", truncate(nullSafe(idea.getScripts(), ""), 4000));
        ideaNode.put("caption", truncate(nullSafe(idea.getCaption(), ""), 2200));
        ideaNode.put("keyword", truncate(nullSafe(idea.getBackgroundKeyword(), ""), 240));
        ideaNode.put("language", "fr");
        putNullable(ideaNode, "cta", truncate(opts.cta(), 140));

        ObjectNode renderNode = job.putObject("render");
        renderNode.put("templateId", opts.templateId());
        renderNode.put("aspectRatio", "9:16");
        renderNode.put("width", opts.width());
        renderNode.put("height", opts.height());
        renderNode.put("fps", opts.fps());
        renderNode.put("durationSec", opts.durationSec());
        renderNode.put("qualityProfile", opts.qualityProfile());
        renderNode.put("captionMode", opts.captionMode());
        renderNode.put("sceneStrategy", "timed-scenes");

        ObjectNode assetsNode = job.putObject("assets");

        // Premier media disponible = backgroundVideo de fallback (requis par le contrat).
        PexelsMultiSearchService.MediaPick fallback = picks.stream()
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst()
                .orElseThrow();

        ObjectNode bg = assetsNode.putObject("backgroundVideo");
        bg.put("url", fallback.url());
        bg.put("provider", fallback.provider());
        bg.put("width", fallback.width());
        bg.put("height", fallback.height());

        ArrayNode scenes = assetsNode.putArray("scenes");
        for (int i = 0; i < specs.size(); i++) {
            SceneBuilderService.SceneSpec spec = specs.get(i);
            PexelsMultiSearchService.MediaPick pick = picks.get(i).orElse(fallback);
            ObjectNode sceneNode = scenes.addObject();
            sceneNode.put("index", spec.index());
            sceneNode.put("durationSec", spec.durationSec());
            sceneNode.put("text", truncate(spec.text(), 240));
            putNullable(sceneNode, "emotion", truncate(spec.emotion(), 60));
            putNullable(sceneNode, "mediaQuery", truncate(spec.mediaQuery(), 240));
            addPlannedSceneMetadata(sceneNode, idea.getPlannedScenes(), i);
            ObjectNode media = sceneNode.putObject("media");
            media.put("url", pick.url());
            media.put("provider", pick.provider());
            media.put("width", pick.width());
            media.put("height", pick.height());
            if (pick.durationSec() > 0) {
                media.put("durationSec", pick.durationSec());
            }
        }

        return job;
    }

    private List<SceneBuilderService.SceneSpec> buildSceneSpecs(ContentIdea idea, double durationSec) {
        List<SceneBuilderService.SceneSpec> planned = buildFromPlannedScenes(idea.getPlannedScenes(), durationSec);
        if (!planned.isEmpty()) {
            return planned;
        }
        return sceneBuilder.build(
                idea.getScripts(),
                idea.getBackgroundKeyword(),
                idea.getCategory(),
                durationSec
        );
    }

    private List<SceneBuilderService.SceneSpec> buildFromPlannedScenes(String plannedScenesJson, double totalDurationSec) {
        if (plannedScenesJson == null || plannedScenesJson.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(plannedScenesJson);
            if (!root.isArray() || root.isEmpty()) {
                return List.of();
            }
            int count = Math.min(SceneBuilderService.MAX_SCENES, root.size());
            double evenDuration = Math.max(SceneBuilderService.MIN_SCENE_SEC, totalDurationSec / count);
            List<SceneBuilderService.SceneSpec> specs = new ArrayList<>(count);
            for (int i = 0; i < count; i++) {
                JsonNode scene = root.get(i);
                String text = firstText(scene, "sceneText", "text", "script");
                if (text.isBlank()) {
                    continue;
                }
                String visualKeyword = firstText(scene, "visualKeyword", "mediaQuery", "keyword");
                String cameraMood = firstText(scene, "cameraMood", "emotion", "mood");
                specs.add(new SceneBuilderService.SceneSpec(
                        i,
                        round1(Math.min(SceneBuilderService.MAX_SCENE_SEC, evenDuration)),
                        text,
                        cameraMood.isBlank() ? inferEmotion(i, count) : cameraMood,
                        visualKeyword.isBlank() ? nullSafe(text, "professional") : visualKeyword
                ));
            }
            return specs;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private void addPlannedSceneMetadata(ObjectNode sceneNode, String plannedScenesJson, int index) {
        if (plannedScenesJson == null || plannedScenesJson.isBlank()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(plannedScenesJson);
            if (!root.isArray() || root.size() <= index) {
                return;
            }
            JsonNode planned = root.get(index);
            putNullable(sceneNode, "cameraMood", truncate(firstText(planned, "cameraMood", "mood"), 80));
            putNullable(sceneNode, "overlayPriority", truncate(firstText(planned, "overlayPriority", "priority"), 40));
        } catch (Exception ignored) {
            // planned_scenes is an enhancement. Rendering still works from script fallback.
        }
    }

    private String firstText(JsonNode node, String... names) {
        if (node == null || node.isNull()) return "";
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value != null && value.isTextual() && !value.asText().isBlank()) {
                return value.asText().trim();
            }
        }
        return "";
    }

    private String inferEmotion(int index, int total) {
        if (index == 0) return "urgent";
        if (index == total - 1) return "finale";
        return "energetic";
    }

    private void putNullable(ObjectNode node, String field, String value) {
        if (value == null || value.isBlank()) {
            node.putNull(field);
        } else {
            node.put(field, value);
        }
    }

    private String nullSafe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength).trim();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}

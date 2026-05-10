package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.model.AudioAsset;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.repository.AudioAssetRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private final AudioAssetRepository audioAssetRepository;
    private final ObjectMapper objectMapper;

    public MultiSceneJobBuilderService(
            SceneBuilderService sceneBuilder,
            PexelsMultiSearchService pexelsMulti,
            AudioAssetRepository audioAssetRepository,
            ObjectMapper objectMapper
    ) {
        this.sceneBuilder = sceneBuilder;
        this.pexelsMulti = pexelsMulti;
        this.audioAssetRepository = audioAssetRepository;
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
            String cta,
            // URLs Pexels explicitement choisies par l'user (étape Médias). Une URL
            // par scène, dans l'ordre. Si non vide, on saute la recherche Pexels
            // et on les utilise directement. Tailles inconnues = on défaut à
            // 1080x1920 (suffisant pour le contrat 1.1.0).
            List<String> selectedMediaUrls,
            List<Map<String, Object>> sceneTextStyles
    ) {
        public static BuildOptions defaults(long workflowRunId, String source) {
            return new BuildOptions(
                    workflowRunId,
                    source,
                    DEFAULT_TEMPLATE_ID,
                    1080,
                    1920,
                    30,
                    15.0,
                    "high",
                    "none",
                    null,
                    null,
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
        double targetDurationSec = Math.min(60.0, Math.max(15.0, effective.durationSec()));

        List<SceneBuilderService.SceneSpec> specs = buildSceneSpecs(idea, targetDurationSec);
        if (specs.isEmpty()) {
            throw new IllegalStateException("Aucune scène extractible du script — script vide ou invalide.");
        }

        // Si l'user a choisi explicitement les URLs (étape Médias du parcours
        // TikTok), on saute la recherche Pexels. Une URL par scène; les URLs
        // surnuméraires sont ignorées, les manquantes complétées par fallback
        // auto via Pexels search sur la query de la scène.
        List<Optional<PexelsMultiSearchService.MediaPick>> picks;
        List<String> selected = effective.selectedMediaUrls();
        if (selected != null && !selected.isEmpty()) {
            picks = new ArrayList<>(specs.size());
            List<String> missingQueries = new ArrayList<>();
            List<Integer> missingIndexes = new ArrayList<>();
            for (int i = 0; i < specs.size(); i++) {
                String url = i < selected.size() ? selected.get(i) : null;
                if (url == null || url.isBlank()) {
                    picks.add(Optional.empty());
                    missingQueries.add(specs.get(i).mediaQuery());
                    missingIndexes.add(i);
                } else {
                    picks.add(Optional.of(new PexelsMultiSearchService.MediaPick(
                            specs.get(i).mediaQuery(),
                            url.trim(),
                            1080,
                            1920,
                            0,
                            "pexels"
                    )));
                }
            }
            if (!missingQueries.isEmpty()) {
                List<Optional<PexelsMultiSearchService.MediaPick>> fillers = pexelsMulti.fetchForQueries(missingQueries);
                for (int j = 0; j < missingIndexes.size(); j++) {
                    picks.set(missingIndexes.get(j), fillers.get(j));
                }
            }
        } else {
            List<String> queries = specs.stream().map(SceneBuilderService.SceneSpec::mediaQuery).toList();
            picks = pexelsMulti.fetchForQueries(queries);
        }

        // Validation: il faut au moins un media réussi pour pouvoir rendre la vidéo.
        boolean anyMedia = picks.stream().anyMatch(Optional::isPresent);
        if (!anyMedia) {
            throw new IllegalStateException("Aucun clip Pexels trouvé pour aucune des scènes.");
        }

        double renderDurationSec = Math.max(targetDurationSec, specs.stream()
                .mapToDouble(SceneBuilderService.SceneSpec::durationSec)
                .sum());
        ObjectNode job = assemble(idea, specs, picks, effective, renderDurationSec);
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
            BuildOptions opts,
            double renderDurationSec
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
        renderNode.put("durationSec", round1(renderDurationSec));
        renderNode.put("qualityProfile", opts.qualityProfile());
        renderNode.put("captionMode", opts.captionMode());
        renderNode.put("sceneStrategy", "timed-scenes");

        ObjectNode assetsNode = job.putObject("assets");
        attachSelectedAudioAssets(assetsNode, idea.getId());

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
            ObjectNode media = sceneNode.putObject("media");
            media.put("url", pick.url());
            media.put("provider", pick.provider());
            media.put("width", pick.width());
            media.put("height", pick.height());
            if (pick.durationSec() > 0) {
                media.put("durationSec", pick.durationSec());
            }
            ObjectNode textStyle = buildSceneTextStyle(opts.sceneTextStyles(), i);
            if (textStyle != null) {
                sceneNode.set("textStyle", textStyle);
            }
        }

        return job;
    }

    private void attachSelectedAudioAssets(ObjectNode assetsNode, Long contentIdeaId) {
        if (contentIdeaId == null) {
            return;
        }
        audioAssetRepository
                .findFirstByContentIdeaIdAndAssetKindAndSelectedIsTrue(contentIdeaId, AudioAsset.AssetKind.voice)
                .filter(asset -> asset.getStorageUrl() != null && !asset.getStorageUrl().isBlank())
                .ifPresent(asset -> {
                    ObjectNode voiceover = assetsNode.putObject("voiceover");
                    voiceover.put("url", asset.getStorageUrl());
                    voiceover.put("provider", "elevenlabs");
                    putNullable(voiceover, "voiceId", truncate(asset.getVoiceId(), 128));
                    voiceover.put("volume", clampDouble(number(asset.getVoiceVolume(), 100.0), 0.0, 200.0));
                });

        audioAssetRepository
                .findFirstByContentIdeaIdAndAssetKindAndSelectedIsTrue(contentIdeaId, AudioAsset.AssetKind.music)
                .filter(asset -> asset.getStorageUrl() != null && !asset.getStorageUrl().isBlank())
                .ifPresent(asset -> {
                    ObjectNode music = assetsNode.putObject("music");
                    music.put("url", asset.getStorageUrl());
                    music.put("volume", clampDouble(number(asset.getMusicVolume(), 30.0), 0.0, 200.0));
                });
    }

    private ObjectNode buildSceneTextStyle(List<Map<String, Object>> styles, int index) {
        if (styles == null || index < 0 || index >= styles.size()) {
            return null;
        }
        Map<String, Object> raw = styles.get(index);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        ObjectNode style = objectMapper.createObjectNode();
        style.put("textX", clampDouble(number(raw.get("textX"), 50.0), 0.0, 100.0));
        style.put("textY", clampDouble(number(raw.get("textY"), 48.0), 0.0, 100.0));
        style.put("textColor", color(raw.get("textColor"), "#ffffff"));
        style.put("fontFamily", truncate(text(raw.get("fontFamily"), "Inter"), 80));
        style.put("fontSize", clampDouble(number(raw.get("fontSize"), 36.0), 14.0, 80.0));
        style.put("fontWeight", (int) clampDouble(number(raw.get("fontWeight"), 800.0), 100.0, 1000.0));
        style.put("uppercase", bool(raw.get("uppercase"), true));
        style.put("shadow", shadow(raw.get("shadow")));
        return style;
    }

    private static double number(Object value, double fallback) {
        if (value instanceof Number n) return n.doubleValue();
        if (value instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private static double clampDouble(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }

    private static boolean bool(Object value, boolean fallback) {
        return value instanceof Boolean b ? b : fallback;
    }

    private static String text(Object value, String fallback) {
        String text = value == null ? "" : String.valueOf(value).trim();
        return text.isBlank() ? fallback : text;
    }

    private static String color(Object value, String fallback) {
        String color = text(value, fallback);
        return color.matches("^#[0-9a-fA-F]{6}$") ? color : fallback;
    }

    private static String shadow(Object value) {
        String shadow = text(value, "strong");
        return shadow.equals("none") || shadow.equals("soft") || shadow.equals("strong") ? shadow : "strong";
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

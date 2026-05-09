package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Size;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Strict request body for the admin "patch content idea" endpoint.
 * Only the editable text fields exposed by the TikTok journey UI are accepted.
 * Statuses, timestamps, urls and ids stay owned by the workflows.
 */
public class ContentIdeaPatchRequest {

    @Size(max = 4_000)
    private String topic;

    /** Synonym kept for the admin UI which calls the field {@code script}. */
    @Size(max = 20_000)
    private String script;

    /** Long-form scenario body (DB column {@code scripts}). */
    @Size(max = 20_000)
    private String scripts;

    /** Planned scenes JSON blob. */
    @Size(max = 20_000)
    private String plannedScenes;

    /** Synonym for {@link #plannedScenes} matching the snake_case alias. */
    @Size(max = 20_000)
    private String planned_scenes;

    @Size(max = 4_000)
    private String caption;

    @Size(max = 200)
    private String keyword;

    /** Synonym matching the camelCase alias used by the admin UI. */
    @Size(max = 200)
    private String backgroundKeyword;

    /**
     * Materializes the patch as the snake_case map expected by
     * {@code videoOpsDataService.patchContentIdea}. Only non-null fields are
     * forwarded so the DB only receives what the operator actually edited.
     */
    public Map<String, Object> toSafePatch() {
        Map<String, Object> safe = new LinkedHashMap<>();
        if (topic != null) safe.put("topic", topic);
        if (script != null) safe.put("scripts", script);
        if (scripts != null) safe.put("scripts", scripts);
        if (plannedScenes != null) safe.put("planned_scenes", plannedScenes);
        if (planned_scenes != null) safe.put("planned_scenes", planned_scenes);
        if (caption != null) safe.put("caption", caption);
        if (keyword != null) safe.put("background_keyword", keyword);
        if (backgroundKeyword != null) safe.put("background_keyword", backgroundKeyword);
        return safe;
    }

    public boolean isEmpty() {
        return toSafePatch().isEmpty();
    }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getScript() { return script; }
    public void setScript(String script) { this.script = script; }
    public String getScripts() { return scripts; }
    public void setScripts(String scripts) { this.scripts = scripts; }
    public String getPlannedScenes() { return plannedScenes; }
    public void setPlannedScenes(String plannedScenes) { this.plannedScenes = plannedScenes; }
    public String getPlanned_scenes() { return planned_scenes; }
    public void setPlanned_scenes(String planned_scenes) { this.planned_scenes = planned_scenes; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public String getBackgroundKeyword() { return backgroundKeyword; }
    public void setBackgroundKeyword(String backgroundKeyword) { this.backgroundKeyword = backgroundKeyword; }
}

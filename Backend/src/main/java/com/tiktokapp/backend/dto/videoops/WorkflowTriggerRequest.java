package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class WorkflowTriggerRequest {

    private Long contentIdeaId;
    @Size(max = 120)
    private String category;
    @Min(1)
    @Max(5)
    private Integer ideaCount;
    private String topic;
    private String script;
    private String caption;
    private String keyword;
    private String source;
    private String tiktokAccountOpenId;
    private Boolean force;
    @Size(max = 120)
    private String templateId;
    @Size(max = 32)
    private String qualityProfile;

    // Paramètres de génération idée + script (étape 1 du parcours TikTok).
    @Size(max = 32)
    private String hookStyle;
    @Size(max = 32)
    private String scriptFormat;
    @Size(max = 32)
    private String tone;
    @Size(max = 32)
    private String audience;
    @Size(max = 32)
    private String durationTarget;
    @Size(max = 8)
    private String language;
    private Double temperature;
    @Size(max = 1000)
    private String inspirationRef;
    @Min(1)
    @Max(10)
    private Integer sceneCount;

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public void setContentIdeaId(Long contentIdeaId) {
        this.contentIdeaId = contentIdeaId;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getIdeaCount() {
        return ideaCount;
    }

    public void setIdeaCount(Integer ideaCount) {
        this.ideaCount = ideaCount;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getScript() {
        return script;
    }

    public void setScript(String script) {
        this.script = script;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getTiktokAccountOpenId() {
        return tiktokAccountOpenId;
    }

    public void setTiktokAccountOpenId(String tiktokAccountOpenId) {
        this.tiktokAccountOpenId = tiktokAccountOpenId;
    }

    public Boolean getForce() {
        return force;
    }

    public void setForce(Boolean force) {
        this.force = force;
    }

    public String getTemplateId() {
        return templateId;
    }

    public void setTemplateId(String templateId) {
        this.templateId = templateId;
    }

    public String getQualityProfile() {
        return qualityProfile;
    }

    public void setQualityProfile(String qualityProfile) {
        this.qualityProfile = qualityProfile;
    }

    public String getHookStyle() { return hookStyle; }
    public void setHookStyle(String hookStyle) { this.hookStyle = hookStyle; }

    public String getScriptFormat() { return scriptFormat; }
    public void setScriptFormat(String scriptFormat) { this.scriptFormat = scriptFormat; }

    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }

    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }

    public String getDurationTarget() { return durationTarget; }
    public void setDurationTarget(String durationTarget) { this.durationTarget = durationTarget; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }

    public String getInspirationRef() { return inspirationRef; }
    public void setInspirationRef(String inspirationRef) { this.inspirationRef = inspirationRef; }

    public Integer getSceneCount() { return sceneCount; }
    public void setSceneCount(Integer sceneCount) { this.sceneCount = sceneCount; }
}

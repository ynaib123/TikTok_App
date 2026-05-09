package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public class WorkflowTriggerRequest {

    public static final int TOPIC_MAX = 500;
    public static final int SCRIPT_MAX = 4000;
    public static final int CAPTION_MAX = 2200;
    public static final int KEYWORD_MAX = 240;
    public static final int SOURCE_MAX = 120;
    public static final int TIKTOK_ACCOUNT_OPENID_MAX = 190;
    public static final int SCENE_MEDIA_URL_MAX = 1000;
    public static final int SCENE_MEDIA_URLS_MAX_COUNT = 10;

    private Long contentIdeaId;
    @Size(max = 120)
    private String category;
    @Min(1)
    @Max(5)
    private Integer ideaCount;
    @Size(max = TOPIC_MAX)
    private String topic;
    @Size(max = SCRIPT_MAX)
    private String script;
    @Size(max = CAPTION_MAX)
    private String caption;
    @Size(max = KEYWORD_MAX)
    private String keyword;
    @Size(max = SOURCE_MAX)
    private String source;
    @Size(max = TIKTOK_ACCOUNT_OPENID_MAX)
    private String tiktokAccountOpenId;
    private Boolean force;
    @Size(max = 120)
    private String templateId;
    @Size(max = 32)
    private String qualityProfile;
    @DecimalMin("15")
    @DecimalMax("60")
    private Double durationSec;

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

    // URLs Pexels (ou autres) explicitement choisies par l'user dans l'étape
    // "Médias" du parcours TikTok. Une URL par scène, dans l'ordre des scènes.
    // Si null/vide, le scene-builder fait son auto-pick comme avant.
    //
    // - taille capée à SCENE_MEDIA_URLS_MAX_COUNT pour éviter qu'un payload
    //   gonflé déclenche une fan-out coûteuse côté n8n / scene-builder.
    // - chaque URL est limitée à SCENE_MEDIA_URL_MAX caractères et doit
    //   commencer par http(s) (les autres schemas — file://, javascript:, etc.
    //   — ne sont jamais des sources légitimes Pexels/CDN).
    @Size(max = SCENE_MEDIA_URLS_MAX_COUNT,
            message = "selectedSceneMediaUrls limité à " + SCENE_MEDIA_URLS_MAX_COUNT + " entrées")
    private List<@Size(max = SCENE_MEDIA_URL_MAX) @Pattern(regexp = "^https?://.+", message = "URL doit commencer par http:// ou https://") String> selectedSceneMediaUrls;
    @Size(max = SCENE_MEDIA_URLS_MAX_COUNT,
            message = "sceneTextStyles limite a " + SCENE_MEDIA_URLS_MAX_COUNT + " entrees")
    private List<Map<String, Object>> sceneTextStyles;

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

    public Double getDurationSec() {
        return durationSec;
    }

    public void setDurationSec(Double durationSec) {
        this.durationSec = durationSec;
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

    public List<String> getSelectedSceneMediaUrls() { return selectedSceneMediaUrls; }
    public void setSelectedSceneMediaUrls(List<String> selectedSceneMediaUrls) { this.selectedSceneMediaUrls = selectedSceneMediaUrls; }
    public List<Map<String, Object>> getSceneTextStyles() { return sceneTextStyles; }
    public void setSceneTextStyles(List<Map<String, Object>> sceneTextStyles) { this.sceneTextStyles = sceneTextStyles; }
}

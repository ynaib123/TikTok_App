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
}

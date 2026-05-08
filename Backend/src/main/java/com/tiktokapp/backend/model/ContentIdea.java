package com.tiktokapp.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "content_ideas")
public class ContentIdea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String category;
    private String topic;
    private String scripts;
    @Column(name = "planned_scenes", columnDefinition = "text")
    private String plannedScenes;
    @Column(name = "generation_review", columnDefinition = "text")
    private String generationReview;
    @Column(name = "script_status")
    private String scriptStatus;
    private String caption;
    @Column(name = "background_keyword")
    private String backgroundKeyword;
    private String status;
    @Column(name = "pipeline_status")
    private String pipelineStatus;
    @Column(name = "publish_status")
    private String publishStatus;
    private String platform;
    @Column(name = "final_video_status")
    private String finalVideoStatus;
    @Column(name = "shotstack_status")
    private String shotstackStatus;
    @Column(name = "shotstack_url")
    private String shotstackUrl;
    @Column(name = "shotstack_render_id")
    private String shotstackRenderId;
    @Column(name = "render_payload", columnDefinition = "text")
    private String renderPayload;
    @Column(name = "render_status")
    private String renderStatus;
    @Column(name = "tiktok_account_open_id")
    private String tiktokAccountOpenId;
    @Column(name = "template_id")
    private String templateId;
    @Column(name = "quality_profile")
    private String qualityProfile;
    @Column(name = "render_engine")
    private String renderEngine;
    @Column(name = "thumbnail_url")
    private String thumbnailUrl;
    @Column(name = "tiktok_publish_id")
    private String tiktokPublishId;
    @Column(name = "tiktok_upload_url")
    private String tiktokUploadUrl;
    @Column(name = "tiktok_upload_status")
    private String tiktokUploadStatus;
    @Column(name = "tiktok_check_status")
    private String tiktokCheckStatus;
    @Column(name = "uploaded_at")
    private Instant uploadedAt;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getScripts() { return scripts; }
    public void setScripts(String scripts) { this.scripts = scripts; }
    public String getPlannedScenes() { return plannedScenes; }
    public void setPlannedScenes(String plannedScenes) { this.plannedScenes = plannedScenes; }
    public String getGenerationReview() { return generationReview; }
    public void setGenerationReview(String generationReview) { this.generationReview = generationReview; }
    public String getScriptStatus() { return scriptStatus; }
    public void setScriptStatus(String scriptStatus) { this.scriptStatus = scriptStatus; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public String getBackgroundKeyword() { return backgroundKeyword; }
    public void setBackgroundKeyword(String backgroundKeyword) { this.backgroundKeyword = backgroundKeyword; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPipelineStatus() { return pipelineStatus; }
    public void setPipelineStatus(String pipelineStatus) { this.pipelineStatus = pipelineStatus; }
    public String getPublishStatus() { return publishStatus; }
    public void setPublishStatus(String publishStatus) { this.publishStatus = publishStatus; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getFinalVideoStatus() { return finalVideoStatus; }
    public void setFinalVideoStatus(String finalVideoStatus) { this.finalVideoStatus = finalVideoStatus; }
    public String getShotstackStatus() { return shotstackStatus; }
    public void setShotstackStatus(String shotstackStatus) { this.shotstackStatus = shotstackStatus; }
    public String getShotstackUrl() { return shotstackUrl; }
    public void setShotstackUrl(String shotstackUrl) { this.shotstackUrl = shotstackUrl; }
    public String getShotstackRenderId() { return shotstackRenderId; }
    public void setShotstackRenderId(String shotstackRenderId) { this.shotstackRenderId = shotstackRenderId; }
    public String getRenderPayload() { return renderPayload; }
    public void setRenderPayload(String renderPayload) { this.renderPayload = renderPayload; }
    public String getRenderStatus() { return renderStatus; }
    public void setRenderStatus(String renderStatus) { this.renderStatus = renderStatus; }
    public String getTiktokAccountOpenId() { return tiktokAccountOpenId; }
    public void setTiktokAccountOpenId(String tiktokAccountOpenId) { this.tiktokAccountOpenId = tiktokAccountOpenId; }
    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }
    public String getQualityProfile() { return qualityProfile; }
    public void setQualityProfile(String qualityProfile) { this.qualityProfile = qualityProfile; }
    public String getRenderEngine() { return renderEngine; }
    public void setRenderEngine(String renderEngine) { this.renderEngine = renderEngine; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }
    public String getTiktokPublishId() { return tiktokPublishId; }
    public void setTiktokPublishId(String tiktokPublishId) { this.tiktokPublishId = tiktokPublishId; }
    public String getTiktokUploadUrl() { return tiktokUploadUrl; }
    public void setTiktokUploadUrl(String tiktokUploadUrl) { this.tiktokUploadUrl = tiktokUploadUrl; }
    public String getTiktokUploadStatus() { return tiktokUploadStatus; }
    public void setTiktokUploadStatus(String tiktokUploadStatus) { this.tiktokUploadStatus = tiktokUploadStatus; }
    public String getTiktokCheckStatus() { return tiktokCheckStatus; }
    public void setTiktokCheckStatus(String tiktokCheckStatus) { this.tiktokCheckStatus = tiktokCheckStatus; }
    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

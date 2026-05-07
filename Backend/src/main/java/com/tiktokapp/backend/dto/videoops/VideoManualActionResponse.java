package com.tiktokapp.backend.dto.videoops;

public class VideoManualActionResponse {

    private final Long id;
    private final String topic;
    private final String shotstackUrl;
    private final String uploadUrl;
    private final String uploadStatus;
    private final String publishStatus;
    private final String finalVideoStatus;
    private final String shotstackStatus;
    private final String pipelineStatus;
    private final String lastError;
    private final String templateId;
    private final String qualityProfile;
    private final String renderEngine;
    private final String thumbnailUrl;

    public VideoManualActionResponse(
            Long id,
            String topic,
            String shotstackUrl,
            String uploadUrl,
            String uploadStatus,
            String publishStatus,
            String finalVideoStatus,
            String shotstackStatus,
            String pipelineStatus,
            String lastError,
            String templateId,
            String qualityProfile,
            String renderEngine,
            String thumbnailUrl
    ) {
        this.id = id;
        this.topic = topic;
        this.shotstackUrl = shotstackUrl;
        this.uploadUrl = uploadUrl;
        this.uploadStatus = uploadStatus;
        this.publishStatus = publishStatus;
        this.finalVideoStatus = finalVideoStatus;
        this.shotstackStatus = shotstackStatus;
        this.pipelineStatus = pipelineStatus;
        this.lastError = lastError;
        this.templateId = templateId;
        this.qualityProfile = qualityProfile;
        this.renderEngine = renderEngine;
        this.thumbnailUrl = thumbnailUrl;
    }

    public Long getId() {
        return id;
    }

    public String getTopic() {
        return topic;
    }

    public String getShotstackUrl() {
        return shotstackUrl;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public String getUploadStatus() {
        return uploadStatus;
    }

    public String getPublishStatus() {
        return publishStatus;
    }

    public String getFinalVideoStatus() {
        return finalVideoStatus;
    }

    public String getShotstackStatus() {
        return shotstackStatus;
    }

    public String getPipelineStatus() {
        return pipelineStatus;
    }

    public String getLastError() {
        return lastError;
    }

    public String getTemplateId() {
        return templateId;
    }

    public String getQualityProfile() {
        return qualityProfile;
    }

    public String getRenderEngine() {
        return renderEngine;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }
}

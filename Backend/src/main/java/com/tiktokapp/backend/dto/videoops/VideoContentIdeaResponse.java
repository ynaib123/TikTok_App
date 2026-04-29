package com.tiktokapp.backend.dto.videoops;

public class VideoContentIdeaResponse {

    private final Long id;
    private final String category;
    private final String topic;
    private final String script;
    private final String caption;
    private final String keyword;
    private final String shotstackStatus;
    private final String tiktokStatus;
    private final String finalVideoStatus;
    private final String shotstackUrl;
    private final String uploadUrl;
    private final String tiktokAccountOpenId;
    private final String pipelineStatus;
    private final String lastError;

    public VideoContentIdeaResponse(
            Long id,
            String category,
            String topic,
            String script,
            String caption,
            String keyword,
            String shotstackStatus,
            String tiktokStatus,
            String finalVideoStatus,
            String shotstackUrl,
            String uploadUrl,
            String tiktokAccountOpenId,
            String pipelineStatus,
            String lastError
    ) {
        this.id = id;
        this.category = category;
        this.topic = topic;
        this.script = script;
        this.caption = caption;
        this.keyword = keyword;
        this.shotstackStatus = shotstackStatus;
        this.tiktokStatus = tiktokStatus;
        this.finalVideoStatus = finalVideoStatus;
        this.shotstackUrl = shotstackUrl;
        this.uploadUrl = uploadUrl;
        this.tiktokAccountOpenId = tiktokAccountOpenId;
        this.pipelineStatus = pipelineStatus;
        this.lastError = lastError;
    }

    public Long getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public String getTopic() {
        return topic;
    }

    public String getScript() {
        return script;
    }

    public String getCaption() {
        return caption;
    }

    public String getKeyword() {
        return keyword;
    }

    public String getShotstackStatus() {
        return shotstackStatus;
    }

    public String getTiktokStatus() {
        return tiktokStatus;
    }

    public String getFinalVideoStatus() {
        return finalVideoStatus;
    }

    public String getShotstackUrl() {
        return shotstackUrl;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public String getTiktokAccountOpenId() {
        return tiktokAccountOpenId;
    }

    public String getPipelineStatus() {
        return pipelineStatus;
    }

    public String getLastError() {
        return lastError;
    }
}

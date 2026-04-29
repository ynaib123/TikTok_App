package com.tiktokapp.backend.dto.videoops;

public class VideoContentIdeaStatusResponse {

    private final long contentIdeaId;
    private final String topic;
    private final String pipelineStage;
    private final String pipelineStageLabel;
    private final String shotstackStatus;
    private final String finalVideoStatus;
    private final String tiktokStatus;
    private final String tiktokUploadStatus;
    private final String tiktokAccountOpenId;
    private final String shotstackUrl;
    private final String uploadUrl;
    private final String lastErrorMessage;
    private final VideoWorkflowRunDetailResponse lastWorkflowRun;
    private final String lastEventMessage;
    private final String lastEventSeverity;
    private final String lastUpdatedAt;

    public VideoContentIdeaStatusResponse(
            long contentIdeaId,
            String topic,
            String pipelineStage,
            String pipelineStageLabel,
            String shotstackStatus,
            String finalVideoStatus,
            String tiktokStatus,
            String tiktokUploadStatus,
            String tiktokAccountOpenId,
            String shotstackUrl,
            String uploadUrl,
            String lastErrorMessage,
            VideoWorkflowRunDetailResponse lastWorkflowRun,
            String lastEventMessage,
            String lastEventSeverity,
            String lastUpdatedAt
    ) {
        this.contentIdeaId = contentIdeaId;
        this.topic = topic;
        this.pipelineStage = pipelineStage;
        this.pipelineStageLabel = pipelineStageLabel;
        this.shotstackStatus = shotstackStatus;
        this.finalVideoStatus = finalVideoStatus;
        this.tiktokStatus = tiktokStatus;
        this.tiktokUploadStatus = tiktokUploadStatus;
        this.tiktokAccountOpenId = tiktokAccountOpenId;
        this.shotstackUrl = shotstackUrl;
        this.uploadUrl = uploadUrl;
        this.lastErrorMessage = lastErrorMessage;
        this.lastWorkflowRun = lastWorkflowRun;
        this.lastEventMessage = lastEventMessage;
        this.lastEventSeverity = lastEventSeverity;
        this.lastUpdatedAt = lastUpdatedAt;
    }

    public long getContentIdeaId() {
        return contentIdeaId;
    }

    public String getTopic() {
        return topic;
    }

    public String getPipelineStage() {
        return pipelineStage;
    }

    public String getPipelineStageLabel() {
        return pipelineStageLabel;
    }

    public String getShotstackStatus() {
        return shotstackStatus;
    }

    public String getFinalVideoStatus() {
        return finalVideoStatus;
    }

    public String getTiktokStatus() {
        return tiktokStatus;
    }

    public String getTiktokUploadStatus() {
        return tiktokUploadStatus;
    }

    public String getTiktokAccountOpenId() {
        return tiktokAccountOpenId;
    }

    public String getShotstackUrl() {
        return shotstackUrl;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public VideoWorkflowRunDetailResponse getLastWorkflowRun() {
        return lastWorkflowRun;
    }

    public String getLastEventMessage() {
        return lastEventMessage;
    }

    public String getLastEventSeverity() {
        return lastEventSeverity;
    }

    public String getLastUpdatedAt() {
        return lastUpdatedAt;
    }
}

package com.tiktokapp.backend.dto.videoops;

public class VideoWorkflowRunResponse {

    private final Long id;
    private final Long contentIdeaId;
    private final String workflowType;
    private final String status;
    private final int attemptNumber;
    private final String errorMessage;
    private final String createdAt;

    public VideoWorkflowRunResponse(
            Long id,
            Long contentIdeaId,
            String workflowType,
            String status,
            int attemptNumber,
            String errorMessage,
            String createdAt
    ) {
        this.id = id;
        this.contentIdeaId = contentIdeaId;
        this.workflowType = workflowType;
        this.status = status;
        this.attemptNumber = attemptNumber;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public String getWorkflowType() {
        return workflowType;
    }

    public String getStatus() {
        return status;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}

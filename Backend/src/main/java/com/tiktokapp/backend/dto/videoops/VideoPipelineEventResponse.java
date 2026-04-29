package com.tiktokapp.backend.dto.videoops;

public class VideoPipelineEventResponse {

    private final Long contentIdeaId;
    private final Long workflowRunId;
    private final String severity;
    private final String eventType;
    private final String message;
    private final String createdAt;

    public VideoPipelineEventResponse(
            Long contentIdeaId,
            Long workflowRunId,
            String severity,
            String eventType,
            String message,
            String createdAt
    ) {
        this.contentIdeaId = contentIdeaId;
        this.workflowRunId = workflowRunId;
        this.severity = severity;
        this.eventType = eventType;
        this.message = message;
        this.createdAt = createdAt;
    }

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public Long getWorkflowRunId() {
        return workflowRunId;
    }

    public String getSeverity() {
        return severity;
    }

    public String getEventType() {
        return eventType;
    }

    public String getMessage() {
        return message;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}

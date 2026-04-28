package com.tiktokapp.backend.dto.videoops;

public class VideoWorkflowActionResponse {

    private final Long runId;
    private final Long contentIdeaId;
    private final String workflowType;
    private final String status;
    private final String message;
    private final boolean reused;

    public VideoWorkflowActionResponse(
            Long runId,
            Long contentIdeaId,
            String workflowType,
            String status,
            String message,
            boolean reused
    ) {
        this.runId = runId;
        this.contentIdeaId = contentIdeaId;
        this.workflowType = workflowType;
        this.status = status;
        this.message = message;
        this.reused = reused;
    }

    public Long getRunId() {
        return runId;
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

    public String getMessage() {
        return message;
    }

    public boolean isReused() {
        return reused;
    }
}

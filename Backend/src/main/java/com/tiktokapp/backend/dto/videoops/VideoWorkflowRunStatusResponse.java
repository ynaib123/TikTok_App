package com.tiktokapp.backend.dto.videoops;

/**
 * Lightweight status snapshot for an in-flight workflow run.
 *
 * Designed for frequent polling from the frontend (every 5–10s while the user
 * watches a render or upload progress) — does not include the response payload
 * or audit-style fields. The {@code ageMs} field lets the UI surface a "still
 * waiting…" hint when a run sits in {@code PENDING}/{@code ACCEPTED} for longer
 * than expected, even before the StuckWorkflowRunDetector kicks in.
 */
public class VideoWorkflowRunStatusResponse {

    private final Long id;
    private final String workflowType;
    private final String status;
    private final long ageMs;
    private final boolean terminal;
    private final String errorMessage;
    private final String createdAt;
    private final String completedAt;

    public VideoWorkflowRunStatusResponse(
            Long id,
            String workflowType,
            String status,
            long ageMs,
            boolean terminal,
            String errorMessage,
            String createdAt,
            String completedAt
    ) {
        this.id = id;
        this.workflowType = workflowType;
        this.status = status;
        this.ageMs = ageMs;
        this.terminal = terminal;
        this.errorMessage = errorMessage;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
    }

    public Long getId() { return id; }
    public String getWorkflowType() { return workflowType; }
    public String getStatus() { return status; }
    public long getAgeMs() { return ageMs; }
    public boolean isTerminal() { return terminal; }
    public String getErrorMessage() { return errorMessage; }
    public String getCreatedAt() { return createdAt; }
    public String getCompletedAt() { return completedAt; }
}

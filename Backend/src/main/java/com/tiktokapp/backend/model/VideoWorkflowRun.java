package com.tiktokapp.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "video_workflow_runs")
public class VideoWorkflowRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_idea_id")
    private Long contentIdeaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "workflow_type", nullable = false, length = 40)
    private VideoWorkflowType workflowType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private VideoWorkflowRunStatus status = VideoWorkflowRunStatus.PENDING;

    @Column(name = "requested_by_email", length = 190)
    private String requestedByEmail;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber = 1;

    @Column(name = "idempotency_key", nullable = false, length = 190)
    private String idempotencyKey;

    @Column(name = "force_requested", nullable = false)
    private boolean forceRequested;

    @Column(name = "request_payload", columnDefinition = "text")
    private String requestPayload;

    @Column(name = "response_payload", columnDefinition = "text")
    private String responsePayload;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public void setContentIdeaId(Long contentIdeaId) {
        this.contentIdeaId = contentIdeaId;
    }

    public VideoWorkflowType getWorkflowType() {
        return workflowType;
    }

    public void setWorkflowType(VideoWorkflowType workflowType) {
        this.workflowType = workflowType;
    }

    public VideoWorkflowRunStatus getStatus() {
        return status;
    }

    public void setStatus(VideoWorkflowRunStatus status) {
        this.status = status;
    }

    public String getRequestedByEmail() {
        return requestedByEmail;
    }

    public void setRequestedByEmail(String requestedByEmail) {
        this.requestedByEmail = requestedByEmail;
    }

    public int getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(int attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public boolean isForceRequested() {
        return forceRequested;
    }

    public void setForceRequested(boolean forceRequested) {
        this.forceRequested = forceRequested;
    }

    public String getRequestPayload() {
        return requestPayload;
    }

    public void setRequestPayload(String requestPayload) {
        this.requestPayload = requestPayload;
    }

    public String getResponsePayload() {
        return responsePayload;
    }

    public void setResponsePayload(String responsePayload) {
        this.responsePayload = responsePayload;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}

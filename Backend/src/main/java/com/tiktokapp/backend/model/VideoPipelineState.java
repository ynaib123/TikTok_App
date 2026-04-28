package com.tiktokapp.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

@Entity
@Table(name = "video_pipeline_states")
public class VideoPipelineState {

    @Id
    @Column(name = "content_idea_id", nullable = false)
    private Long contentIdeaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_stage", nullable = false, length = 40)
    private VideoPipelineStage pipelineStage = VideoPipelineStage.UNKNOWN;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_workflow_type", length = 40)
    private VideoWorkflowType lastWorkflowType;

    @Column(name = "last_workflow_run_id")
    private Long lastWorkflowRunId;

    @Column(name = "last_error_message", length = 500)
    private String lastErrorMessage;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long version;

    @PrePersist
    void onCreate() {
        updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public void setContentIdeaId(Long contentIdeaId) {
        this.contentIdeaId = contentIdeaId;
    }

    public VideoPipelineStage getPipelineStage() {
        return pipelineStage;
    }

    public void setPipelineStage(VideoPipelineStage pipelineStage) {
        this.pipelineStage = pipelineStage;
    }

    public VideoWorkflowType getLastWorkflowType() {
        return lastWorkflowType;
    }

    public void setLastWorkflowType(VideoWorkflowType lastWorkflowType) {
        this.lastWorkflowType = lastWorkflowType;
    }

    public Long getLastWorkflowRunId() {
        return lastWorkflowRunId;
    }

    public void setLastWorkflowRunId(Long lastWorkflowRunId) {
        this.lastWorkflowRunId = lastWorkflowRunId;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public void setLastErrorMessage(String lastErrorMessage) {
        this.lastErrorMessage = lastErrorMessage;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

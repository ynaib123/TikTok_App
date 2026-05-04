package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AlertNotifyRequest {

    @NotBlank
    @Size(max = 60)
    private String workflowType;

    @Size(max = 80)
    private String runId;

    @Size(max = 80)
    private String contentIdeaId;

    @Size(max = 1000)
    private String errorMessage;

    @Size(max = 120)
    private String node;

    private Integer attempt;
    private Integer maxAttempts;
    private Boolean fatal;

    @Size(max = 32)
    private String severity;

    @Size(max = 500)
    private String n8nUrl;

    public String getWorkflowType() { return workflowType; }
    public void setWorkflowType(String workflowType) { this.workflowType = workflowType; }

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public String getContentIdeaId() { return contentIdeaId; }
    public void setContentIdeaId(String contentIdeaId) { this.contentIdeaId = contentIdeaId; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getNode() { return node; }
    public void setNode(String node) { this.node = node; }

    public Integer getAttempt() { return attempt; }
    public void setAttempt(Integer attempt) { this.attempt = attempt; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

    public Boolean getFatal() { return fatal; }
    public void setFatal(Boolean fatal) { this.fatal = fatal; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getN8nUrl() { return n8nUrl; }
    public void setN8nUrl(String n8nUrl) { this.n8nUrl = n8nUrl; }
}

package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class WorkflowTriggerRequest {

    private Long contentIdeaId;
    @Size(max = 120)
    private String category;
    @Min(1)
    @Max(5)
    private Integer ideaCount;
    private String topic;
    private String source;
    private Boolean force;

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public void setContentIdeaId(Long contentIdeaId) {
        this.contentIdeaId = contentIdeaId;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getIdeaCount() {
        return ideaCount;
    }

    public void setIdeaCount(Integer ideaCount) {
        this.ideaCount = ideaCount;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Boolean getForce() {
        return force;
    }

    public void setForce(Boolean force) {
        this.force = force;
    }
}

package com.tiktokapp.backend.dto.videoops;

public class ContentIdeaCreateRequest {
    private String category;
    private String topic;
    private String status;
    private String pipelineStatus;
    private String publishStatus;
    private String platform;
    private String templateId;
    private String tiktokAccountOpenId;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPipelineStatus() { return pipelineStatus; }
    public void setPipelineStatus(String pipelineStatus) { this.pipelineStatus = pipelineStatus; }
    public String getPublishStatus() { return publishStatus; }
    public void setPublishStatus(String publishStatus) { this.publishStatus = publishStatus; }
    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }
    public String getTiktokAccountOpenId() { return tiktokAccountOpenId; }
    public void setTiktokAccountOpenId(String tiktokAccountOpenId) { this.tiktokAccountOpenId = tiktokAccountOpenId; }
}

package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BatchPublishRequest {

    @NotEmpty
    @Size(max = 100)
    private List<Long> contentIdeaIds;

    @Size(max = 190)
    private String tiktokAccountOpenId;

    public List<Long> getContentIdeaIds() { return contentIdeaIds; }
    public void setContentIdeaIds(List<Long> contentIdeaIds) { this.contentIdeaIds = contentIdeaIds; }

    public String getTiktokAccountOpenId() { return tiktokAccountOpenId; }
    public void setTiktokAccountOpenId(String tiktokAccountOpenId) { this.tiktokAccountOpenId = tiktokAccountOpenId; }
}

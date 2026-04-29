package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Min;

public class TikTokInitPublishContextRequest {

    @Min(1)
    private Long contentIdeaId;

    private String tiktokAccountOpenId;

    public Long getContentIdeaId() {
        return contentIdeaId;
    }

    public void setContentIdeaId(Long contentIdeaId) {
        this.contentIdeaId = contentIdeaId;
    }

    public String getTiktokAccountOpenId() {
        return tiktokAccountOpenId;
    }

    public void setTiktokAccountOpenId(String tiktokAccountOpenId) {
        this.tiktokAccountOpenId = tiktokAccountOpenId;
    }
}

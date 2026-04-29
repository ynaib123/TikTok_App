package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.NotBlank;

public class TikTokAccountContextRequest {

    @NotBlank
    private String tiktokAccountOpenId;

    private Boolean includeCreatorInfo;

    public String getTiktokAccountOpenId() {
        return tiktokAccountOpenId;
    }

    public void setTiktokAccountOpenId(String tiktokAccountOpenId) {
        this.tiktokAccountOpenId = tiktokAccountOpenId;
    }

    public Boolean getIncludeCreatorInfo() {
        return includeCreatorInfo;
    }

    public void setIncludeCreatorInfo(Boolean includeCreatorInfo) {
        this.includeCreatorInfo = includeCreatorInfo;
    }
}

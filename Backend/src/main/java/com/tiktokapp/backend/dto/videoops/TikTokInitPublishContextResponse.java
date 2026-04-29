package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class TikTokInitPublishContextResponse {

    private final long contentIdeaId;
    private final String tiktokAccountOpenId;
    private final String accessToken;
    private final String tokenType;
    private final String title;
    private final String shotstackUrl;
    private final List<String> privacyLevelOptions;
    private final String selectedPrivacyLevel;

    public TikTokInitPublishContextResponse(
            long contentIdeaId,
            String tiktokAccountOpenId,
            String accessToken,
            String tokenType,
            String title,
            String shotstackUrl,
            List<String> privacyLevelOptions,
            String selectedPrivacyLevel
    ) {
        this.contentIdeaId = contentIdeaId;
        this.tiktokAccountOpenId = tiktokAccountOpenId;
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.title = title;
        this.shotstackUrl = shotstackUrl;
        this.privacyLevelOptions = privacyLevelOptions;
        this.selectedPrivacyLevel = selectedPrivacyLevel;
    }

    public long getContentIdeaId() {
        return contentIdeaId;
    }

    public String getTiktokAccountOpenId() {
        return tiktokAccountOpenId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getTitle() {
        return title;
    }

    public String getShotstackUrl() {
        return shotstackUrl;
    }

    public List<String> getPrivacyLevelOptions() {
        return privacyLevelOptions;
    }

    public String getSelectedPrivacyLevel() {
        return selectedPrivacyLevel;
    }
}

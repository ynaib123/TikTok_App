package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class TikTokAccountContextResponse {

    private final String tiktokAccountOpenId;
    private final String accessToken;
    private final String tokenType;
    private final String scope;
    private final List<String> privacyLevelOptions;
    private final String selectedPrivacyLevel;

    public TikTokAccountContextResponse(
            String tiktokAccountOpenId,
            String accessToken,
            String tokenType,
            String scope,
            List<String> privacyLevelOptions,
            String selectedPrivacyLevel
    ) {
        this.tiktokAccountOpenId = tiktokAccountOpenId;
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.scope = scope;
        this.privacyLevelOptions = privacyLevelOptions;
        this.selectedPrivacyLevel = selectedPrivacyLevel;
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

    public String getScope() {
        return scope;
    }

    public List<String> getPrivacyLevelOptions() {
        return privacyLevelOptions;
    }

    public String getSelectedPrivacyLevel() {
        return selectedPrivacyLevel;
    }
}

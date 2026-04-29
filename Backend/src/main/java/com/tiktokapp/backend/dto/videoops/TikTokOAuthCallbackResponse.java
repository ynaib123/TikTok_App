package com.tiktokapp.backend.dto.videoops;

public class TikTokOAuthCallbackResponse {

    private final String message;
    private final String redirectPath;
    private final String openId;
    private final String scope;
    private final String displayName;

    public TikTokOAuthCallbackResponse(String message, String redirectPath, String openId, String scope, String displayName) {
        this.message = message;
        this.redirectPath = redirectPath;
        this.openId = openId;
        this.scope = scope;
        this.displayName = displayName;
    }

    public String getMessage() {
        return message;
    }

    public String getRedirectPath() {
        return redirectPath;
    }

    public String getOpenId() {
        return openId;
    }

    public String getScope() {
        return scope;
    }

    public String getDisplayName() {
        return displayName;
    }
}

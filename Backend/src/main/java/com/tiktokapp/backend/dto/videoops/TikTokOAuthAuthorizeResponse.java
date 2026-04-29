package com.tiktokapp.backend.dto.videoops;

public class TikTokOAuthAuthorizeResponse {

    private final String authUrl;
    private final String state;

    public TikTokOAuthAuthorizeResponse(String authUrl, String state) {
        this.authUrl = authUrl;
        this.state = state;
    }

    public String getAuthUrl() {
        return authUrl;
    }

    public String getState() {
        return state;
    }
}

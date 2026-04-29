package com.tiktokapp.backend.dto.videoops;

public class TikTokOAuthAuthorizeRequest {

    private String redirectPath;

    public String getRedirectPath() {
        return redirectPath;
    }

    public void setRedirectPath(String redirectPath) {
        this.redirectPath = redirectPath;
    }
}

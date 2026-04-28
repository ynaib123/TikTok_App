package com.tiktokapp.backend.dto.videoops;

public class TikTokAccountResponse {

    private final Long id;
    private final String nickname;
    private final String openId;
    private final String scope;
    private final String environment;
    private final String status;

    public TikTokAccountResponse(Long id, String nickname, String openId, String scope, String environment, String status) {
        this.id = id;
        this.nickname = nickname;
        this.openId = openId;
        this.scope = scope;
        this.environment = environment;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public String getNickname() {
        return nickname;
    }

    public String getOpenId() {
        return openId;
    }

    public String getScope() {
        return scope;
    }

    public String getEnvironment() {
        return environment;
    }

    public String getStatus() {
        return status;
    }
}

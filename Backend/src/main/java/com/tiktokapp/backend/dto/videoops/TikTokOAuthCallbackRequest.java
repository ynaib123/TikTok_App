package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.NotBlank;

public class TikTokOAuthCallbackRequest {

    @NotBlank(message = "code est obligatoire")
    private String code;

    @NotBlank(message = "state est obligatoire")
    private String state;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }
}

package com.tiktokapp.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class TikTokUploadRequest {

    @NotBlank(message = "shotstackUrl est obligatoire")
    private String shotstackUrl;

    @NotBlank(message = "uploadUrl est obligatoire")
    private String uploadUrl;

    public String getShotstackUrl() {
        return shotstackUrl;
    }

    public void setShotstackUrl(String shotstackUrl) {
        this.shotstackUrl = shotstackUrl;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public void setUploadUrl(String uploadUrl) {
        this.uploadUrl = uploadUrl;
    }
}

package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.NotBlank;

public class VideoUploadRequest {

    @NotBlank(message = "shotstackUrl est obligatoire")
    private String shotstackUrl;

    @NotBlank(message = "uploadUrl est obligatoire")
    private String uploadUrl;

    private Boolean force;

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

    public Boolean getForce() {
        return force;
    }

    public void setForce(Boolean force) {
        this.force = force;
    }
}

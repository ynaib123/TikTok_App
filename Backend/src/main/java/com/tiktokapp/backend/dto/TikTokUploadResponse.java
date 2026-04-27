package com.tiktokapp.backend.dto;

public class TikTokUploadResponse {

    private final boolean success;
    private final int statusCode;
    private final long uploadedBytes;
    private final String responseBody;

    public TikTokUploadResponse(boolean success, int statusCode, long uploadedBytes, String responseBody) {
        this.success = success;
        this.statusCode = statusCode;
        this.uploadedBytes = uploadedBytes;
        this.responseBody = responseBody;
    }

    public boolean isSuccess() {
        return success;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public long getUploadedBytes() {
        return uploadedBytes;
    }

    public String getResponseBody() {
        return responseBody;
    }
}

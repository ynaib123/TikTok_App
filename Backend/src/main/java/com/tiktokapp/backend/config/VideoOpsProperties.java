package com.tiktokapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app.video-ops")
public class VideoOpsProperties {

    private String internalApiSecret = "";
    private String workflowCallbackSecret = "";
    private String workflowCallbackHmacSecret = "";
    private long workflowCallbackMaxSkewSeconds = 300;
    private boolean allowLegacyWorkflowCallbackSecret = true;
    private String tokenEncryptionKey = "";
    private String tiktokClientKey = "";
    private String tiktokClientSecret = "";
    private String tiktokRedirectUri = "";
    private String tiktokOauthScopes = "user.info.basic,video.publish";
    private int queryLimit = 50;
    private long idempotencyWindowSeconds = 90;
    private int batchPublishMaxSize = 20;
    private int batchPublishConcurrency = 3;
    private long batchPublishItemTimeoutSeconds = 60;
    private List<String> allowedShotstackHosts = new ArrayList<>(List.of(
            "shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com"
    ));
    private List<String> allowedUploadHosts = new ArrayList<>(List.of(
            "open-upload.tiktokapis.com",
            "open.tiktokapis.com",
            "business-api.tiktok.com"
    ));

    public String getTiktokClientKey() {
        return tiktokClientKey;
    }

    public String getWorkflowCallbackSecret() {
        return workflowCallbackSecret;
    }

    public String getInternalApiSecret() {
        return internalApiSecret;
    }

    public void setInternalApiSecret(String internalApiSecret) {
        this.internalApiSecret = internalApiSecret;
    }

    public void setWorkflowCallbackSecret(String workflowCallbackSecret) {
        this.workflowCallbackSecret = workflowCallbackSecret;
    }

    public String getWorkflowCallbackHmacSecret() {
        return workflowCallbackHmacSecret;
    }

    public void setWorkflowCallbackHmacSecret(String workflowCallbackHmacSecret) {
        this.workflowCallbackHmacSecret = workflowCallbackHmacSecret;
    }

    public long getWorkflowCallbackMaxSkewSeconds() {
        return workflowCallbackMaxSkewSeconds;
    }

    public void setWorkflowCallbackMaxSkewSeconds(long workflowCallbackMaxSkewSeconds) {
        this.workflowCallbackMaxSkewSeconds = workflowCallbackMaxSkewSeconds;
    }

    public boolean isAllowLegacyWorkflowCallbackSecret() {
        return allowLegacyWorkflowCallbackSecret;
    }

    public void setAllowLegacyWorkflowCallbackSecret(boolean allowLegacyWorkflowCallbackSecret) {
        this.allowLegacyWorkflowCallbackSecret = allowLegacyWorkflowCallbackSecret;
    }

    public String getTokenEncryptionKey() {
        return tokenEncryptionKey;
    }

    public void setTokenEncryptionKey(String tokenEncryptionKey) {
        this.tokenEncryptionKey = tokenEncryptionKey;
    }

    public void setTiktokClientKey(String tiktokClientKey) {
        this.tiktokClientKey = tiktokClientKey;
    }

    public String getTiktokClientSecret() {
        return tiktokClientSecret;
    }

    public void setTiktokClientSecret(String tiktokClientSecret) {
        this.tiktokClientSecret = tiktokClientSecret;
    }

    public String getTiktokRedirectUri() {
        return tiktokRedirectUri;
    }

    public void setTiktokRedirectUri(String tiktokRedirectUri) {
        this.tiktokRedirectUri = tiktokRedirectUri;
    }

    public String getTiktokOauthScopes() {
        return tiktokOauthScopes;
    }

    public void setTiktokOauthScopes(String tiktokOauthScopes) {
        this.tiktokOauthScopes = tiktokOauthScopes;
    }

    public int getQueryLimit() {
        return queryLimit;
    }

    public void setQueryLimit(int queryLimit) {
        this.queryLimit = queryLimit;
    }

    public long getIdempotencyWindowSeconds() {
        return idempotencyWindowSeconds;
    }

    public void setIdempotencyWindowSeconds(long idempotencyWindowSeconds) {
        this.idempotencyWindowSeconds = idempotencyWindowSeconds;
    }

    public int getBatchPublishMaxSize() { return batchPublishMaxSize; }
    public void setBatchPublishMaxSize(int batchPublishMaxSize) { this.batchPublishMaxSize = batchPublishMaxSize; }

    public int getBatchPublishConcurrency() { return batchPublishConcurrency; }
    public void setBatchPublishConcurrency(int batchPublishConcurrency) { this.batchPublishConcurrency = batchPublishConcurrency; }

    public long getBatchPublishItemTimeoutSeconds() { return batchPublishItemTimeoutSeconds; }
    public void setBatchPublishItemTimeoutSeconds(long s) { this.batchPublishItemTimeoutSeconds = s; }

    public List<String> getAllowedShotstackHosts() {
        return allowedShotstackHosts;
    }

    public void setAllowedShotstackHosts(List<String> allowedShotstackHosts) {
        this.allowedShotstackHosts = allowedShotstackHosts;
    }

    public List<String> getAllowedUploadHosts() {
        return allowedUploadHosts;
    }

    public void setAllowedUploadHosts(List<String> allowedUploadHosts) {
        this.allowedUploadHosts = allowedUploadHosts;
    }
}

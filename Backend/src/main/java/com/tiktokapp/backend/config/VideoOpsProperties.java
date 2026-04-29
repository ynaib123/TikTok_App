package com.tiktokapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app.video-ops")
public class VideoOpsProperties {

    private String supabaseUrl = "";
    private String supabaseServiceRoleKey = "";
    private String n8nMainPipelineWebhook = "";
    private String n8nCheckShotstackWebhook = "";
    private String n8nRenderTemplateWebhook = "";
    private String n8nPublishTikTokWebhook = "";
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
    private List<String> allowedShotstackHosts = new ArrayList<>(List.of(
            "shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com"
    ));
    private List<String> allowedUploadHosts = new ArrayList<>(List.of(
            "open-upload.tiktokapis.com",
            "open.tiktokapis.com",
            "business-api.tiktok.com"
    ));

    public String getSupabaseUrl() {
        return supabaseUrl;
    }

    public void setSupabaseUrl(String supabaseUrl) {
        this.supabaseUrl = supabaseUrl;
    }

    public String getSupabaseServiceRoleKey() {
        return supabaseServiceRoleKey;
    }

    public void setSupabaseServiceRoleKey(String supabaseServiceRoleKey) {
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    public String getN8nMainPipelineWebhook() {
        return n8nMainPipelineWebhook;
    }

    public void setN8nMainPipelineWebhook(String n8nMainPipelineWebhook) {
        this.n8nMainPipelineWebhook = n8nMainPipelineWebhook;
    }

    public String getN8nCheckShotstackWebhook() {
        return n8nCheckShotstackWebhook;
    }

    public void setN8nCheckShotstackWebhook(String n8nCheckShotstackWebhook) {
        this.n8nCheckShotstackWebhook = n8nCheckShotstackWebhook;
    }

    public String getN8nPublishTikTokWebhook() {
        return n8nPublishTikTokWebhook;
    }

    public void setN8nPublishTikTokWebhook(String n8nPublishTikTokWebhook) {
        this.n8nPublishTikTokWebhook = n8nPublishTikTokWebhook;
    }

    public String getN8nRenderTemplateWebhook() {
        return n8nRenderTemplateWebhook;
    }

    public void setN8nRenderTemplateWebhook(String n8nRenderTemplateWebhook) {
        this.n8nRenderTemplateWebhook = n8nRenderTemplateWebhook;
    }

    public String getTiktokClientKey() {
        return tiktokClientKey;
    }

    public String getWorkflowCallbackSecret() {
        return workflowCallbackSecret;
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

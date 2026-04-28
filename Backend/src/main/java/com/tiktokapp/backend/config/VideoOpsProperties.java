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
    private String n8nPublishTikTokWebhook = "";
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

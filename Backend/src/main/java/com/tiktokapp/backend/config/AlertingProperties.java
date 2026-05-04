package com.tiktokapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.alerting")
public class AlertingProperties {

    private String slackWebhookUrl = "";
    private long cooldownSeconds = 300;
    private int rateLimitMaxAlerts = 10;
    private long rateLimitWindowSeconds = 600;
    private long stuckRunThresholdSeconds = 600;
    private long stuckRunCheckIntervalMs = 120_000;
    private boolean enabled = true;

    public String getSlackWebhookUrl() {
        return slackWebhookUrl;
    }

    public void setSlackWebhookUrl(String slackWebhookUrl) {
        this.slackWebhookUrl = slackWebhookUrl;
    }

    public long getCooldownSeconds() {
        return cooldownSeconds;
    }

    public void setCooldownSeconds(long cooldownSeconds) {
        this.cooldownSeconds = cooldownSeconds;
    }

    public int getRateLimitMaxAlerts() {
        return rateLimitMaxAlerts;
    }

    public void setRateLimitMaxAlerts(int rateLimitMaxAlerts) {
        this.rateLimitMaxAlerts = rateLimitMaxAlerts;
    }

    public long getRateLimitWindowSeconds() {
        return rateLimitWindowSeconds;
    }

    public void setRateLimitWindowSeconds(long rateLimitWindowSeconds) {
        this.rateLimitWindowSeconds = rateLimitWindowSeconds;
    }

    public long getStuckRunThresholdSeconds() {
        return stuckRunThresholdSeconds;
    }

    public void setStuckRunThresholdSeconds(long stuckRunThresholdSeconds) {
        this.stuckRunThresholdSeconds = stuckRunThresholdSeconds;
    }

    public long getStuckRunCheckIntervalMs() {
        return stuckRunCheckIntervalMs;
    }

    public void setStuckRunCheckIntervalMs(long stuckRunCheckIntervalMs) {
        this.stuckRunCheckIntervalMs = stuckRunCheckIntervalMs;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}

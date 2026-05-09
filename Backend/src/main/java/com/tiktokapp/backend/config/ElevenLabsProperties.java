package com.tiktokapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * ElevenLabs TTS configuration. Disabled by default so the app boots without
 * a key; the AudioController returns 503 SERVICE_UNAVAILABLE in that case.
 */
@ConfigurationProperties(prefix = "app.elevenlabs")
public class ElevenLabsProperties {

    private boolean enabled = false;
    private String apiKey = "";
    private String baseUrl = "https://api.elevenlabs.io";
    private String defaultModelId = "eleven_multilingual_v2";
    private int previewMaxChars = 240;
    private int generateMaxChars = 4_000;
    private long readTimeoutMs = 60_000L;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getDefaultModelId() { return defaultModelId; }
    public void setDefaultModelId(String defaultModelId) { this.defaultModelId = defaultModelId; }
    public int getPreviewMaxChars() { return previewMaxChars; }
    public void setPreviewMaxChars(int previewMaxChars) { this.previewMaxChars = previewMaxChars; }
    public int getGenerateMaxChars() { return generateMaxChars; }
    public void setGenerateMaxChars(int generateMaxChars) { this.generateMaxChars = generateMaxChars; }
    public long getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(long readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
}

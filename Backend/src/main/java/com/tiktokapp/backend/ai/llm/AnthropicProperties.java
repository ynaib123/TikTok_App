package com.tiktokapp.backend.ai.llm;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Anthropic Claude Messages API configuration. Disabled by default — the
 * AgentOrchestrator returns 503 when the provider isn't enabled, instead of
 * 500-ing on a missing API key.
 */
@ConfigurationProperties(prefix = "app.anthropic")
public class AnthropicProperties {

    private boolean enabled = false;
    private String apiKey = "";
    private String baseUrl = "https://api.anthropic.com";
    private String version = "2023-06-01";
    private String defaultModelId = "claude-sonnet-4-6";
    private int maxTokens = 4_096;
    private int maxToolLoopIterations = 10;
    private long readTimeoutMs = 90_000L;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getDefaultModelId() { return defaultModelId; }
    public void setDefaultModelId(String defaultModelId) { this.defaultModelId = defaultModelId; }
    public int getMaxTokens() { return maxTokens; }
    public void setMaxTokens(int maxTokens) { this.maxTokens = maxTokens; }
    public int getMaxToolLoopIterations() { return maxToolLoopIterations; }
    public void setMaxToolLoopIterations(int maxToolLoopIterations) {
        this.maxToolLoopIterations = maxToolLoopIterations;
    }
    public long getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(long readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
}

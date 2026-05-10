package com.tiktokapp.backend.ai.llm;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Groq Cloud OpenAI-compatible API configuration. Permet d'utiliser Llama
 * 3.3 70B (et autres) gratuitement avec rate limit ~14 400 req/jour. Le
 * provider tool-use vit dans {@link GroqProvider} et expose les réponses
 * dans le format Anthropic content-blocks via conversion, pour rester
 * transparent au {@link com.tiktokapp.backend.ai.AgentOrchestrator}.
 */
@ConfigurationProperties(prefix = "app.groq")
public class GroqProperties {

    private boolean enabled = false;
    private String apiKey = "";
    private String baseUrl = "https://api.groq.com/openai/v1";
    private String defaultModelId = "llama-3.3-70b-versatile";
    private int maxTokens = 4_096;
    private long readTimeoutMs = 60_000L;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getDefaultModelId() { return defaultModelId; }
    public void setDefaultModelId(String defaultModelId) { this.defaultModelId = defaultModelId; }
    public int getMaxTokens() { return maxTokens; }
    public void setMaxTokens(int maxTokens) { this.maxTokens = maxTokens; }
    public long getReadTimeoutMs() { return readTimeoutMs; }
    public void setReadTimeoutMs(long readTimeoutMs) { this.readTimeoutMs = readTimeoutMs; }
}

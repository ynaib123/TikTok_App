package com.tiktokapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the TikTok native sounds feature.
 *
 * <ul>
 *   <li>{@code research-api-key} — TikTok Research API key (optional). When present,
 *       the nightly refresh job fetches trending sounds automatically. When absent,
 *       the library is seeded manually or via import-url.</li>
 *   <li>{@code research-api-base-url} — base URL for the Research API.</li>
 *   <li>{@code oembed-base-url} — TikTok oEmbed endpoint used to resolve video metadata
 *       when importing a sound from a video URL.</li>
 *   <li>{@code refresh-enabled} — toggles the nightly refresh @Scheduled job.</li>
 *   <li>{@code default-limit} — max sounds returned per API call.</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.tiktok-sounds")
public class TikTokSoundProperties {

    private String  researchApiKey     = "";
    private String  researchApiBaseUrl = "https://open.tiktokapis.com";
    private String  oembedBaseUrl      = "https://www.tiktok.com/oembed";
    private boolean refreshEnabled     = false;
    private int     defaultLimit       = 40;
    private long    readTimeoutMs      = 15_000L;

    public String  getResearchApiKey()          { return researchApiKey; }
    public void    setResearchApiKey(String v)  { this.researchApiKey = v; }
    public String  getResearchApiBaseUrl()      { return researchApiBaseUrl; }
    public void    setResearchApiBaseUrl(String v) { this.researchApiBaseUrl = v; }
    public String  getOembedBaseUrl()           { return oembedBaseUrl; }
    public void    setOembedBaseUrl(String v)   { this.oembedBaseUrl = v; }
    public boolean isRefreshEnabled()           { return refreshEnabled; }
    public void    setRefreshEnabled(boolean v) { this.refreshEnabled = v; }
    public int     getDefaultLimit()            { return defaultLimit; }
    public void    setDefaultLimit(int v)       { this.defaultLimit = v; }
    public long    getReadTimeoutMs()           { return readTimeoutMs; }
    public void    setReadTimeoutMs(long v)     { this.readTimeoutMs = v; }

    public boolean hasResearchApiKey() {
        return researchApiKey != null && !researchApiKey.isBlank();
    }
}

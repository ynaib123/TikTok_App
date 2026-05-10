package com.tiktokapp.backend.service.audio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.TikTokSoundProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * HTTP client for two external TikTok APIs :
 *
 * <ol>
 *   <li><b>oEmbed</b> ({@code https://www.tiktok.com/oembed?url=VIDEO_URL}) —
 *       no authentication required. Used to resolve video metadata (title,
 *       thumbnail, author) when a user imports a sound from a video URL.</li>
 *   <li><b>Research API</b> ({@code https://open.tiktokapis.com/v2/research/video/query/}) —
 *       requires a Research API client key. Used by the nightly refresh job to
 *       pull trending sounds. Disabled when {@code researchApiKey} is blank.</li>
 * </ol>
 *
 * Both paths are guarded by the existing {@code tiktok} Resilience4j circuit
 * breaker and retry config defined in {@code application.yml}.
 */
@Component
public class TikTokSoundClient {

    private static final Logger logger = LoggerFactory.getLogger(TikTokSoundClient.class);

    // Matches TikTok video URLs:  .../video/1234567890
    private static final Pattern VIDEO_ID_PATTERN =
            Pattern.compile("/video/(\\d{10,20})");

    // TikTok music URLs end with the soundId after the last dash:
    //   https://www.tiktok.com/music/Calm-Down-7180544885490210566
    // We extract the trailing numeric run of 10-20 digits.
    private static final Pattern TRAILING_NUMBER_PATTERN =
            Pattern.compile("(\\d{10,20})(?:[/?#].*)?$");

    private final TikTokSoundProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TikTokSoundClient(TikTokSoundProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient  = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    // ── oEmbed import ────────────────────────────────────────────────────────

    /**
     * Resolves any TikTok URL to an {@link OembedResult}.
     *
     * Handles three formats transparently :
     * <ol>
     *   <li><b>Short URL</b> ({@code vt.tiktok.com}, {@code vm.tiktok.com}) — follows
     *       the HTTP redirect chain first to obtain the canonical URL, then
     *       delegates to the video or music branch below.</li>
     *   <li><b>Video URL</b> ({@code .../video/ID}) — calls oEmbed to get title,
     *       author and thumbnail.</li>
     *   <li><b>Music/sound URL</b> ({@code .../music/Title-ID}) — no HTTP call
     *       needed; the soundId and title are extracted directly from the slug.</li>
     * </ol>
     */
    public OembedResult resolveUrl(String url) {
        String canonical = isShortUrl(url) ? expandShortUrl(url) : url;
        if (isMusicUrl(canonical)) {
            return parseMusicUrl(canonical);
        }
        return fetchOembed(canonical);
    }

    /** Returns true for known TikTok short-link hosts. */
    public static boolean isShortUrl(String url) {
        if (url == null) return false;
        return url.contains("vt.tiktok.com")
            || url.contains("vm.tiktok.com")
            || url.contains("m.tiktok.com/v/");
    }

    /**
     * Follows HTTP redirects on a short TikTok URL and returns the final
     * canonical URL. Uses a lightweight HEAD request; falls back to GET if
     * the server does not honour HEAD. Returns the original URL on failure
     * so callers always have something to work with.
     */
    private String expandShortUrl(String shortUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(shortUrl))
                    .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .header("User-Agent", "Mozilla/5.0 (compatible; TikTokSoundBot/1.0)")
                    .build();
            // httpClient is configured with NORMAL redirect — response.uri()
            // is the URI of the *last* response in the redirect chain.
            HttpResponse<Void> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.discarding());
            String finalUrl = response.uri().toString();
            logger.debug("short_url resolved {} → {}", shortUrl, finalUrl);
            return finalUrl;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            logger.warn("short_url expand failed url={} reason={}", shortUrl, ex.getMessage());
            return shortUrl; // best-effort fallback
        }
    }

    /** Parses a music page URL without any HTTP call. */
    private OembedResult parseMusicUrl(String musicUrl) {
        String soundId = extractId(musicUrl);
        // Derive a human-readable title from the URL slug
        // e.g. /music/Calm-Down-7180544885490210566 → "Calm Down"
        String slug = musicUrl.replaceAll("[?#].*", "")
                              .replaceAll(".*/music/", "")
                              .replaceAll("-?(\\d{10,20})$", "")
                              .replace("-", " ")
                              .trim();
        String title = slug.isEmpty() ? "Son TikTok" : capitalise(slug);
        return new OembedResult(soundId, title, "TikTok", null);
    }

    private static String capitalise(String s) {
        if (s == null || s.isBlank()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    @CircuitBreaker(name = "tiktok")
    @Retry(name = "tiktok")
    public OembedResult fetchOembed(String videoUrl) {
        String encodedUrl = URLEncoder.encode(videoUrl, StandardCharsets.UTF_8);
        URI uri = URI.create(properties.getOembedBaseUrl() + "?url=" + encodedUrl);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "TikTok oEmbed echec (" + response.statusCode() + ")");
            }
            return parseOembed(videoUrl, response.body());
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "TikTok oEmbed injoignable: " + ex.getMessage(), ex);
        }
    }

    private OembedResult parseOembed(String videoUrl, String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            String id       = extractId(videoUrl);
            String title    = root.path("title").asText("").trim();
            String author   = root.path("author_name").asText("").trim();
            String thumbUrl = root.path("thumbnail_url").asText("").trim();
            return new OembedResult(
                    id,
                    title.isEmpty() ? "Son TikTok" : title,
                    author.isEmpty() ? "TikTok" : author,
                    thumbUrl.isEmpty() ? null : thumbUrl
            );
        } catch (IOException ex) {
            logger.warn("oEmbed parse error: {}", ex.getMessage());
            return new OembedResult(extractId(videoUrl), "Son TikTok", "TikTok", null);
        }
    }

    /**
     * Returns true when the URL points to a TikTok sound/music page.
     * Examples:
     *   https://www.tiktok.com/music/Calm-Down-7180544885490210566
     *   https://vm.tiktok.com/music/7180544885490210566
     */
    public static boolean isMusicUrl(String url) {
        return url != null && url.contains("/music/");
    }

    /**
     * Extracts the numeric ID from any TikTok URL — works for both video and
     * music/sound URLs. Falls back to a hash of the raw URL on failure.
     *
     * Video URL:  .../video/7180544885490210566  → "7180544885490210566"
     * Music URL:  .../music/Calm-Down-7180544885490210566 → "7180544885490210566"
     */
    public static String extractId(String url) {
        if (url == null || url.isBlank()) return null;
        // Strip query string and fragment
        String path = url.replaceAll("[?#].*", "").trim();
        // Try video pattern first
        Matcher vm = VIDEO_ID_PATTERN.matcher(path);
        if (vm.find()) return vm.group(1);
        // For music URLs and any other format: grab the trailing numeric run
        Matcher tm = TRAILING_NUMBER_PATTERN.matcher(path);
        if (tm.find()) return tm.group(1);
        // Last resort: hash
        return String.valueOf(Math.abs(url.hashCode()));
    }

    /** @deprecated Use {@link #extractId(String)} */
    public static String extractVideoId(String url) {
        return extractId(url);
    }

    // ── Research API — trending sounds ───────────────────────────────────────

    /**
     * Queries the TikTok Research API for up to {@code limit} trending videos
     * and extracts their {@code music_id} + metadata.
     * Returns an empty list when the Research API key is not configured.
     */
    @CircuitBreaker(name = "tiktok")
    @Retry(name = "tiktok")
    public List<ResearchSoundResult> fetchTrendingSounds(String regionCode, int limit) {
        if (!properties.hasResearchApiKey()) {
            logger.debug("TikTok Research API key not configured — skipping trending refresh.");
            return List.of();
        }

        URI uri = URI.create(
                properties.getResearchApiBaseUrl() + "/v2/research/video/query/");

        Map<String, Object> queryBody = Map.of(
                "query", Map.of(
                        "and", List.of(
                                Map.of("operation", "IN",
                                       "field_name", "region_code",
                                       "field_values", List.of(regionCode))
                        )
                ),
                "fields", "id,music_id,music_title,music_author_name,music_duration,music_cover_image_url,music_play_url,share_count",
                "max_count", Math.min(limit, 100),
                "start_date", todayMinus(30),
                "end_date", today()
        );

        try {
            String bodyJson = objectMapper.writeValueAsString(queryBody);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                    .header("Authorization", "Bearer " + properties.getResearchApiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                logger.warn("TikTok Research API status={} body={}", response.statusCode(),
                        abbreviate(response.body()));
                return List.of();
            }
            return parseResearchResponse(response.body());
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            logger.warn("TikTok Research API unreachable: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<ResearchSoundResult> parseResearchResponse(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode videos = root.path("data").path("videos");
            List<ResearchSoundResult> results = new ArrayList<>();
            if (!videos.isArray()) return results;

            for (JsonNode v : videos) {
                String musicId = v.path("music_id").asText("").trim();
                if (musicId.isBlank() || musicId.equals("0")) continue;
                results.add(new ResearchSoundResult(
                        musicId,
                        v.path("music_title").asText("").trim(),
                        v.path("music_author_name").asText("").trim(),
                        v.path("music_duration").asInt(0) * 1000,
                        nullIfBlank(v.path("music_cover_image_url").asText("")),
                        nullIfBlank(v.path("music_play_url").asText("")),
                        v.path("share_count").asLong(0)
                ));
            }
            return results;
        } catch (IOException ex) {
            logger.warn("Research API parse error: {}", ex.getMessage());
            return List.of();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private static String abbreviate(String s) {
        if (s == null) return "";
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }

    private static String today() {
        return java.time.LocalDate.now().toString();
    }

    private static String todayMinus(int days) {
        return java.time.LocalDate.now().minusDays(days).toString();
    }

    // ── Result records ───────────────────────────────────────────────────────

    public record OembedResult(
            String videoId,
            String title,
            String authorName,
            String thumbnailUrl
    ) {}

    public record ResearchSoundResult(
            String soundId,
            String title,
            String authorName,
            int    durationMs,
            String coverUrl,
            String playUrl,
            long   shareCount
    ) {}
}

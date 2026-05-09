package com.tiktokapp.backend.service.audio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.ElevenLabsProperties;
import com.tiktokapp.backend.dto.audio.VoiceCardResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Thin HTTP client for ElevenLabs : voice listing + TTS generation.
 *
 * <p>Network calls are guarded by Resilience4j {@code @CircuitBreaker(name = "elevenlabs")}
 * + {@code @Retry(name = "elevenlabs")}. Both instances inherit the {@code default}
 * config from {@code application.yml} unless overridden.
 *
 * <p>Returns audio bytes raw — persisting them to R2 / disk is the caller's job.
 */
@Component
public class ElevenLabsClient {

    private static final Logger logger = LoggerFactory.getLogger(ElevenLabsClient.class);

    private final ElevenLabsProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ElevenLabsClient(ElevenLabsProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isEnabled() {
        return properties.isEnabled() && properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "ElevenLabs n'est pas configuré. Définis ELEVENLABS_API_KEY et app.elevenlabs.enabled=true.");
        }
    }

    @CircuitBreaker(name = "elevenlabs")
    @Retry(name = "elevenlabs")
    public List<VoiceCardResponse> listVoices() {
        requireEnabled();
        HttpRequest request = HttpRequest.newBuilder(URI.create(properties.getBaseUrl() + "/v1/voices"))
                .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                .header("xi-api-key", properties.getApiKey())
                .header("Accept", "application/json")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw upstreamFailure("voices.list", response.statusCode(), response.body());
            }
            return parseVoices(response.body());
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "ElevenLabs unreachable: " + ex.getMessage(), ex);
        }
    }

    @CircuitBreaker(name = "elevenlabs")
    @Retry(name = "elevenlabs")
    public byte[] textToSpeech(String voiceId, String text, String modelId) {
        requireEnabled();
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text est obligatoire.");
        }
        if (text.length() > properties.getGenerateMaxChars()) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "text dépasse la limite (" + properties.getGenerateMaxChars() + " chars).");
        }
        String resolvedModel = (modelId == null || modelId.isBlank())
                ? properties.getDefaultModelId() : modelId;
        Map<String, Object> body = Map.of(
                "text", text,
                "model_id", resolvedModel,
                "voice_settings", Map.of(
                        "stability", 0.5,
                        "similarity_boost", 0.75,
                        "style", 0.0,
                        "use_speaker_boost", true
                )
        );
        try {
            String bodyJson = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(
                            properties.getBaseUrl() + "/v1/text-to-speech/" + voiceId))
                    .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                    .header("xi-api-key", properties.getApiKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "audio/mpeg")
                    .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 400) {
                String errorBody = response.body() == null ? "" : new String(response.body());
                throw upstreamFailure("tts", response.statusCode(), errorBody);
            }
            return response.body();
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "ElevenLabs TTS unreachable: " + ex.getMessage(), ex);
        }
    }

    private List<VoiceCardResponse> parseVoices(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode voices = root.path("voices");
            List<VoiceCardResponse> list = new ArrayList<>();
            voices.forEach(v -> list.add(new VoiceCardResponse(
                    v.path("voice_id").asText(""),
                    v.path("name").asText(""),
                    v.path("labels").path("language").asText(""),
                    v.path("labels").path("gender").asText(""),
                    v.path("labels").path("accent").asText(""),
                    v.path("preview_url").asText(""),
                    v.path("description").asText("")
            )));
            return list;
        } catch (IOException ex) {
            logger.warn("ElevenLabs voices payload invalide: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ElevenLabs voices payload invalide.", ex);
        }
    }

    private ResponseStatusException upstreamFailure(String op, int status, String body) {
        logger.warn("elevenlabs op={} status={} body={}", op, status, abbreviate(body));
        HttpStatus mapped = switch (status) {
            case 401, 403 -> HttpStatus.BAD_GATEWAY;
            case 429       -> HttpStatus.TOO_MANY_REQUESTS;
            case 422       -> HttpStatus.UNPROCESSABLE_ENTITY;
            default        -> HttpStatus.BAD_GATEWAY;
        };
        return new ResponseStatusException(mapped, "ElevenLabs " + op + " échec (" + status + ")");
    }

    private static String abbreviate(String value) {
        if (value == null) return "";
        return value.length() > 200 ? value.substring(0, 200) + "..." : value;
    }
}

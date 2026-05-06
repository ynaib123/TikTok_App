package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackResponse;
import com.tiktokapp.backend.model.TikTokAccount;
import com.tiktokapp.backend.repository.TikTokAccountRepository;
import com.tiktokapp.backend.service.JwtService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TikTokOAuthService {

    private static final Logger logger = LoggerFactory.getLogger(TikTokOAuthService.class);

    private static final String TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
    private static final String TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
    private static final String TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url";

    private final VideoOpsProperties properties;
    private final VideoOpsCryptoService cryptoService;
    private final JwtService jwtService;
    private final TikTokAccountRepository tiktokAccountRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TikTokOAuthService(
            VideoOpsProperties properties,
            VideoOpsCryptoService cryptoService,
            JwtService jwtService,
            TikTokAccountRepository tiktokAccountRepository,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.cryptoService = cryptoService;
        this.jwtService = jwtService;
        this.tiktokAccountRepository = tiktokAccountRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public TikTokOAuthAuthorizeResponse createAuthorizationUrl(String adminEmail, String redirectPath) {
        ensureConfigured();
        String normalizedRedirectPath = normalizeRedirectPath(redirectPath);
        String state = jwtService.generateTikTokOauthState(adminEmail, normalizedRedirectPath);
        String authUrl = TIKTOK_AUTHORIZE_URL
                + "?client_key=" + encode(properties.getTiktokClientKey())
                + "&response_type=code"
                + "&scope=" + encode(properties.getTiktokOauthScopes())
                + "&redirect_uri=" + encode(properties.getTiktokRedirectUri())
                + "&state=" + encode(state);
        return new TikTokOAuthAuthorizeResponse(authUrl, state);
    }

    public TikTokOAuthCallbackResponse completeAuthorization(String adminEmail, String code, String stateToken) {
        ensureConfigured();

        Claims claims;
        try {
            claims = jwtService.parseTikTokOauthState(stateToken);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le state OAuth TikTok est invalide ou expire.", exception);
        }

        if (!adminEmail.equalsIgnoreCase(String.valueOf(claims.getSubject()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Le state OAuth TikTok ne correspond pas a la session admin.");
        }

        String redirectPath = normalizeRedirectPath(claims.get("redirectPath", String.class));
        JsonNode tokenPayload = exchangeAuthorizationCode(code);
        String openId = requiredText(tokenPayload, "open_id");
        String scope = requiredText(tokenPayload, "scope");
        String accessToken = requiredText(tokenPayload, "access_token");
        String displayName = fetchDisplayName(accessToken);
        upsertTikTokAccount(tokenPayload, openId);

        return new TikTokOAuthCallbackResponse(
                "Compte TikTok connecte avec succes.",
                redirectPath,
                openId,
                scope,
                displayName
        );
    }

    public String completeAuthorizationFromServerCallback(String code, String state) {
        ensureConfigured();

        Claims claims;
        try {
            claims = jwtService.parseTikTokOauthState(state);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le state OAuth TikTok est invalide ou expire.", exception);
        }

        String redirectPath = normalizeRedirectPath(claims.get("redirectPath", String.class));
        JsonNode tokenPayload = exchangeAuthorizationCode(code);
        String openId = requiredText(tokenPayload, "open_id");
        upsertTikTokAccount(tokenPayload, openId);

        return redirectPath;
    }

    @CircuitBreaker(name = "tiktok", fallbackMethod = "refreshAccessTokenFallback")
    @Retry(name = "tiktok")
    public JsonNode refreshAccessToken(String refreshToken) {
        ensureConfigured();
        String body = formBody(Map.of(
                "client_key", properties.getTiktokClientKey(),
                "client_secret", properties.getTiktokClientSecret(),
                "grant_type", "refresh_token",
                "refresh_token", refreshToken
        ));
        return sendTikTokRequest(HttpRequest.newBuilder()
                .uri(URI.create(TIKTOK_TOKEN_URL))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build(), "Impossible de rafraichir le token TikTok.");
    }

    @SuppressWarnings("unused")
    private JsonNode refreshAccessTokenFallback(String refreshToken, Throwable cause) {
        logger.warn("tiktok circuit breaker open or retries exhausted on refreshAccessToken: {}", cause.getMessage());
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "TikTok API indisponible (refresh token). Reessaie dans 60s.",
                cause
        );
    }

    @CircuitBreaker(name = "tiktok", fallbackMethod = "fetchCreatorInfoFallback")
    @Retry(name = "tiktok")
    public JsonNode fetchCreatorInfo(String accessToken) {
        ensureConfigured();
        return sendTikTokRequest(HttpRequest.newBuilder()
                .uri(URI.create("https://open.tiktokapis.com/v2/post/publish/creator_info/query/"))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json; charset=UTF-8")
                .header("Authorization", "Bearer " + accessToken)
                .POST(HttpRequest.BodyPublishers.noBody())
                .build(), "Impossible de lire creator_info TikTok.");
    }

    @SuppressWarnings("unused")
    private JsonNode fetchCreatorInfoFallback(String accessToken, Throwable cause) {
        logger.warn("tiktok circuit breaker open or retries exhausted on fetchCreatorInfo: {}", cause.getMessage());
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "TikTok API indisponible (creator info). Reessaie dans 60s.",
                cause
        );
    }

    public List<String> extractPrivacyLevelOptions(JsonNode creatorInfoPayload) {
        List<String> options = new ArrayList<>();
        JsonNode optionNodes = creatorInfoPayload.path("data").path("privacy_level_options");
        if (optionNodes.isArray()) {
            optionNodes.forEach(node -> {
                String value = node.asText("");
                if (value != null && !value.isBlank()) {
                    options.add(value.trim());
                }
            });
        }
        return options;
    }

    private JsonNode exchangeAuthorizationCode(String code) {
        String body = formBody(Map.of(
                "client_key", properties.getTiktokClientKey(),
                "client_secret", properties.getTiktokClientSecret(),
                "code", code,
                "grant_type", "authorization_code",
                "redirect_uri", properties.getTiktokRedirectUri()
        ));
        return sendTikTokRequest(HttpRequest.newBuilder()
                .uri(URI.create(TIKTOK_TOKEN_URL))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build(), "Impossible d echanger le code OAuth TikTok.");
    }

    private String fetchDisplayName(String accessToken) {
        try {
            JsonNode payload = sendTikTokRequest(HttpRequest.newBuilder()
                    .uri(URI.create(TIKTOK_USER_INFO_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build(), "Impossible de lire les informations du compte TikTok.");
            return payload.path("data").path("user").path("display_name").asText("");
        } catch (ResponseStatusException exception) {
            return "";
        }
    }

    private void upsertTikTokAccount(JsonNode tokenPayload, String openId) {
        TikTokAccount account = tiktokAccountRepository.findFirstByOpenId(openId)
                .orElseGet(TikTokAccount::new);
        Instant now = Instant.now();
        account.setOpenId(requiredText(tokenPayload, "open_id"));
        account.setAccessToken(cryptoService.encryptIfConfigured(requiredText(tokenPayload, "access_token")));
        account.setRefreshToken(cryptoService.encryptIfConfigured(requiredText(tokenPayload, "refresh_token")));
        account.setTokenType(requiredText(tokenPayload, "token_type"));
        account.setScope(requiredText(tokenPayload, "scope"));
        account.setAccessTokenExpiresAt(resolveExpiry(tokenPayload, "expires_in", now, Duration.ofHours(24)));
        account.setRefreshTokenExpiresAt(resolveExpiry(tokenPayload, "refresh_expires_in", now, null));
        account.setLastTokenRefreshAt(now);
        account.setLastTokenRefreshError(null);
        account.setTokenStatus(TikTokAccount.TokenStatus.ACTIVE);
        tiktokAccountRepository.save(account);
    }

    private Instant resolveExpiry(JsonNode payload, String fieldName, Instant now, Duration fallback) {
        JsonNode field = payload.path(fieldName);
        if (field.isNumber()) {
            long seconds = field.asLong();
            if (seconds > 0) {
                return now.plusSeconds(seconds);
            }
        }
        return fallback == null ? null : now.plus(fallback);
    }

    private JsonNode sendTikTokRequest(HttpRequest request, String fallbackMessage) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            JsonNode payload = body == null || body.isBlank()
                    ? objectMapper.createObjectNode()
                    : objectMapper.readTree(body);

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        fallbackMessage + " TikTok a repondu " + response.statusCode() + formatTikTokError(payload)
                );
            }

            JsonNode errorNode = payload.path("error");
            if (errorNode.isObject()) {
                String errorCode = errorNode.path("code").asText("");
                if (!errorCode.isBlank() && !"ok".equalsIgnoreCase(errorCode)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            fallbackMessage + formatTikTokError(payload)
                    );
                }
            }

            return payload;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, fallbackMessage, exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, fallbackMessage, exception);
        }
    }

    private String requiredText(JsonNode payload, String fieldName) {
        String value = payload.path(fieldName).asText("");
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Reponse TikTok incomplete: " + fieldName + " manquant.");
        }
        return value;
    }

    private String normalizeRedirectPath(String redirectPath) {
        String fallback = "/accounts";
        if (redirectPath == null || redirectPath.isBlank()) {
            return fallback;
        }
        String normalized = redirectPath.trim();
        if (!normalized.startsWith("/")) {
            return fallback;
        }
        if (normalized.startsWith("//")) {
            return fallback;
        }
        return normalized;
    }

    private String formatTikTokError(JsonNode payload) {
        String topLevelError = payload.path("error").asText("");
        String errorCode = payload.path("error").path("code").asText("");
        String errorMessage = payload.path("error").path("message").asText("");
        String selectedCode = !errorCode.isBlank() ? errorCode : topLevelError;
        if (selectedCode.isBlank() && errorMessage.isBlank()) {
            return ".";
        }
        StringBuilder builder = new StringBuilder(": ");
        if (!selectedCode.isBlank()) {
            builder.append(selectedCode);
        }
        if (!errorMessage.isBlank()) {
            if (!selectedCode.isBlank()) {
                builder.append(" - ");
            }
            builder.append(errorMessage);
        }
        return builder.toString();
    }

    private String formBody(Map<String, String> values) {
        StringBuilder builder = new StringBuilder();
        values.forEach((key, value) -> {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(encode(key)).append('=').append(encode(value));
        });
        return builder.toString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private void ensureConfigured() {
        if (isBlank(properties.getTiktokClientKey())
                || isBlank(properties.getTiktokClientSecret())
                || isBlank(properties.getTiktokRedirectUri())) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "La configuration OAuth TikTok est incomplete sur le backend."
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackResponse;
import com.tiktokapp.backend.service.JwtService;
import io.jsonwebtoken.Claims;
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
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class TikTokOAuthService {

    private static final String TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
    private static final String TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
    private static final String TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url";

    private final VideoOpsProperties properties;
    private final SupabaseVideoOpsGateway supabaseGateway;
    private final VideoOpsCryptoService cryptoService;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TikTokOAuthService(
            VideoOpsProperties properties,
            SupabaseVideoOpsGateway supabaseGateway,
            VideoOpsCryptoService cryptoService,
            JwtService jwtService,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.supabaseGateway = supabaseGateway;
        this.cryptoService = cryptoService;
        this.jwtService = jwtService;
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
        String refreshToken = requiredText(tokenPayload, "refresh_token");
        String tokenType = requiredText(tokenPayload, "token_type");
        String displayName = fetchDisplayName(accessToken);

        Map<String, Object> accountPayload = new LinkedHashMap<>();
        accountPayload.put("open_id", openId);
        accountPayload.put("access_token", cryptoService.encryptIfConfigured(accessToken));
        accountPayload.put("refresh_token", cryptoService.encryptIfConfigured(refreshToken));
        accountPayload.put("token_type", tokenType);
        accountPayload.put("scope", scope);

        JsonNode existingAccounts = supabaseGateway.findTikTokAccountsByOpenId(openId);
        if (existingAccounts.isArray() && !existingAccounts.isEmpty()) {
            long accountId = existingAccounts.get(0).path("id").asLong();
            supabaseGateway.updateTikTokAccount(accountId, accountPayload);
        } else {
            supabaseGateway.createTikTokAccount(accountPayload);
        }

        return new TikTokOAuthCallbackResponse(
                "Compte TikTok connecte avec succes.",
                redirectPath,
                openId,
                scope,
                displayName
        );
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
        String fallback = "/tiktok-accounts";
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

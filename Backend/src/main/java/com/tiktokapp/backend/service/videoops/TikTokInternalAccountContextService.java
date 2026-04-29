package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TikTokInternalAccountContextService {

    private final SupabaseVideoOpsGateway supabaseGateway;
    private final TikTokOAuthService tikTokOAuthService;
    private final VideoOpsCryptoService cryptoService;

    public TikTokInternalAccountContextService(
            SupabaseVideoOpsGateway supabaseGateway,
            TikTokOAuthService tikTokOAuthService,
            VideoOpsCryptoService cryptoService
    ) {
        this.supabaseGateway = supabaseGateway;
        this.tikTokOAuthService = tikTokOAuthService;
        this.cryptoService = cryptoService;
    }

    public TikTokAccountContextResponse buildContext(TikTokAccountContextRequest request) {
        String targetOpenId = trimToNull(request.getTiktokAccountOpenId());
        if (targetOpenId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tiktokAccountOpenId est obligatoire.");
        }

        JsonNode accountRows = supabaseGateway.findTikTokAccountsByOpenId(targetOpenId);
        if (!accountRows.isArray() || accountRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun compte TikTok correspondant a cet open_id.");
        }
        JsonNode account = accountRows.get(0);

        String decryptedRefreshToken = cryptoService.decryptIfNeeded(trimToNull(account.path("refresh_token").asText("")));
        if (decryptedRefreshToken == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le compte TikTok n'a pas de refresh_token exploitable.");
        }

        JsonNode refreshPayload = tikTokOAuthService.refreshAccessToken(decryptedRefreshToken);
        String accessToken = requiredText(refreshPayload, "access_token");
        String refreshToken = requiredText(refreshPayload, "refresh_token");
        String openId = requiredText(refreshPayload, "open_id");
        String tokenType = requiredText(refreshPayload, "token_type");
        String scope = requiredText(refreshPayload, "scope");

        Map<String, Object> accountPayload = new LinkedHashMap<>();
        accountPayload.put("access_token", cryptoService.encryptIfConfigured(accessToken));
        accountPayload.put("refresh_token", cryptoService.encryptIfConfigured(refreshToken));
        accountPayload.put("open_id", openId);
        accountPayload.put("token_type", tokenType);
        accountPayload.put("scope", scope);
        supabaseGateway.updateTikTokAccount(account.path("id").asLong(), accountPayload);

        List<String> privacyLevelOptions = List.of();
        String selectedPrivacyLevel = null;
        if (Boolean.TRUE.equals(request.getIncludeCreatorInfo())) {
            JsonNode creatorInfo = tikTokOAuthService.fetchCreatorInfo(accessToken);
            privacyLevelOptions = tikTokOAuthService.extractPrivacyLevelOptions(creatorInfo);
            if (privacyLevelOptions.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "creator_info TikTok n'a renvoye aucune privacy_level_options.");
            }
            selectedPrivacyLevel = selectPrivacyLevel(privacyLevelOptions);
        }

        return new TikTokAccountContextResponse(
                openId,
                accessToken,
                tokenType,
                scope,
                privacyLevelOptions,
                selectedPrivacyLevel
        );
    }

    private String selectPrivacyLevel(List<String> options) {
        if (options.stream().anyMatch("SELF_ONLY"::equalsIgnoreCase)) {
            return "SELF_ONLY";
        }
        return options.get(0);
    }

    private String requiredText(JsonNode payload, String fieldName) {
        String value = trimToNull(payload.path(fieldName).asText(""));
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Reponse TikTok incomplete: " + fieldName + " manquant.");
        }
        return value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

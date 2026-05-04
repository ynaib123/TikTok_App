package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextResponse;
import com.tiktokapp.backend.model.TikTokAccount;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TikTokInternalAccountContextService {

    private final TikTokTokenRefreshService tokenRefreshService;
    private final TikTokOAuthService tikTokOAuthService;
    private final VideoOpsCryptoService cryptoService;

    public TikTokInternalAccountContextService(
            TikTokTokenRefreshService tokenRefreshService,
            TikTokOAuthService tikTokOAuthService,
            VideoOpsCryptoService cryptoService
    ) {
        this.tokenRefreshService = tokenRefreshService;
        this.tikTokOAuthService = tikTokOAuthService;
        this.cryptoService = cryptoService;
    }

    public TikTokAccountContextResponse buildContext(TikTokAccountContextRequest request) {
        String targetOpenId = trimToNull(request.getTiktokAccountOpenId());
        if (targetOpenId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tiktokAccountOpenId est obligatoire.");
        }

        TikTokAccount account = tokenRefreshService.ensureValidAccessToken(targetOpenId);
        String accessToken = cryptoService.decryptIfNeeded(trimToNull(account.getAccessToken()));
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED");
        }
        String openId = trimToNull(account.getOpenId());
        String tokenType = trimToNull(account.getTokenType());
        String scope = trimToNull(account.getScope());

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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

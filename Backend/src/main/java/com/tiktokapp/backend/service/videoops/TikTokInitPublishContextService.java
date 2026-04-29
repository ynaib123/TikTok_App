package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TikTokInitPublishContextService {

    private final SupabaseVideoOpsGateway supabaseGateway;
    private final TikTokOAuthService tikTokOAuthService;
    private final VideoOpsCryptoService cryptoService;

    public TikTokInitPublishContextService(
            SupabaseVideoOpsGateway supabaseGateway,
            TikTokOAuthService tikTokOAuthService,
            VideoOpsCryptoService cryptoService
    ) {
        this.supabaseGateway = supabaseGateway;
        this.tikTokOAuthService = tikTokOAuthService;
        this.cryptoService = cryptoService;
    }

    public TikTokInitPublishContextResponse buildContext(TikTokInitPublishContextRequest request) {
        long contentIdeaId = requirePositive(request.getContentIdeaId(), "contentIdeaId est obligatoire.");
        JsonNode rows = supabaseGateway.fetchInitPublishContentIdea(contentIdeaId);
        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable.");
        }

        JsonNode contentIdea = rows.get(0);
        String platform = trimToNull(contentIdea.path("platform").asText(""));
        if (platform != null && !"tiktok".equalsIgnoreCase(platform)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cette contentIdea n'est pas prevue pour TikTok.");
        }
        String finalVideoStatus = trimToNull(contentIdea.path("final_video_status").asText(""));
        if (finalVideoStatus != null && !"ready".equalsIgnoreCase(finalVideoStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La video finale n'est pas encore prete.");
        }
        String targetOpenId = trimToNull(request.getTiktokAccountOpenId());
        if (targetOpenId == null) {
            targetOpenId = trimToNull(contentIdea.path("tiktok_account_open_id").asText(""));
        }
        if (targetOpenId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun tiktokAccountOpenId n'est defini pour cette video.");
        }

        String shotstackUrl = trimToNull(contentIdea.path("shotstack_url").asText(""));
        if (shotstackUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La video finale Shotstack est absente.");
        }

        String publishStatus = trimToNull(contentIdea.path("publish_status").asText(""));
        if (publishStatus != null && "published".equalsIgnoreCase(publishStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cette video est deja marquee comme publiee.");
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

        JsonNode creatorInfo = tikTokOAuthService.fetchCreatorInfo(accessToken);
        List<String> privacyLevelOptions = tikTokOAuthService.extractPrivacyLevelOptions(creatorInfo);
        if (privacyLevelOptions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "creator_info TikTok n'a renvoye aucune privacy_level_options.");
        }

        return new TikTokInitPublishContextResponse(
                contentIdeaId,
                openId,
                accessToken,
                tokenType,
                buildTitle(contentIdea.path("caption").asText("")),
                shotstackUrl,
                privacyLevelOptions,
                selectPrivacyLevel(privacyLevelOptions)
        );
    }

    private long requirePositive(Long value, String message) {
        if (value == null || value <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value;
    }

    private String requiredText(JsonNode payload, String fieldName) {
        String value = trimToNull(payload.path(fieldName).asText(""));
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Reponse TikTok incomplete: " + fieldName + " manquant.");
        }
        return value;
    }

    private String buildTitle(String caption) {
        String normalized = trimToNull(caption);
        if (normalized == null) {
            return "Video TikTok";
        }
        return normalized.length() > 150 ? normalized.substring(0, 150) : normalized;
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

package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextResponse;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TikTokInitPublishContextService {

    private final ContentIdeaGateway contentIdeaGateway;
    private final TikTokInternalAccountContextService accountContextService;

    public TikTokInitPublishContextService(
            ContentIdeaGateway contentIdeaGateway,
            TikTokInternalAccountContextService accountContextService
    ) {
        this.contentIdeaGateway = contentIdeaGateway;
        this.accountContextService = accountContextService;
    }

    public TikTokInitPublishContextResponse buildContext(TikTokInitPublishContextRequest request) {
        long contentIdeaId = requirePositive(request.getContentIdeaId(), "contentIdeaId est obligatoire.");
        JsonNode rows = contentIdeaGateway.fetchInitPublishContentIdea(contentIdeaId);
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

        TikTokAccountContextRequest accountRequest = new TikTokAccountContextRequest();
        accountRequest.setTiktokAccountOpenId(targetOpenId);
        accountRequest.setIncludeCreatorInfo(true);
        TikTokAccountContextResponse accountContext = accountContextService.buildContext(accountRequest);
        List<String> privacyLevelOptions = accountContext.getPrivacyLevelOptions();

        return new TikTokInitPublishContextResponse(
                contentIdeaId,
                accountContext.getTiktokAccountOpenId(),
                accountContext.getAccessToken(),
                accountContext.getTokenType(),
                buildTitle(contentIdea.path("caption").asText("")),
                shotstackUrl,
                privacyLevelOptions,
                accountContext.getSelectedPrivacyLevel()
        );
    }

    private long requirePositive(Long value, String message) {
        if (value == null || value <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

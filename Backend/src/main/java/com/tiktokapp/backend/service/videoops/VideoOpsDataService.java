package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.ContentIdeaCreateRequest;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.model.TikTokAccount;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import com.tiktokapp.backend.repository.TikTokAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Internal CRUD service for content_ideas and tiktok_accounts — consumed by n8n via internal endpoints.
 */
@Service
public class VideoOpsDataService {

    private final ContentIdeaRepository contentIdeaRepo;
    private final TikTokAccountRepository tiktokAccountRepo;
    private final SupabaseVideoOpsGateway gateway;

    public VideoOpsDataService(
            ContentIdeaRepository contentIdeaRepo,
            TikTokAccountRepository tiktokAccountRepo,
            SupabaseVideoOpsGateway gateway
    ) {
        this.contentIdeaRepo = contentIdeaRepo;
        this.tiktokAccountRepo = tiktokAccountRepo;
        this.gateway = gateway;
    }

    @Transactional
    public JsonNode createContentIdea(ContentIdeaCreateRequest request) {
        ContentIdea idea = new ContentIdea();
        idea.setCategory(request.getCategory());
        idea.setTopic(request.getTopic());
        idea.setStatus(request.getStatus() != null ? request.getStatus() : "new");
        idea.setPipelineStatus(request.getPipelineStatus());
        idea.setPublishStatus(request.getPublishStatus() != null ? request.getPublishStatus() : "draft");
        idea.setPlatform(request.getPlatform() != null ? request.getPlatform() : "tiktok");
        idea.setTemplateId(request.getTemplateId());
        idea.setTiktokAccountOpenId(request.getTiktokAccountOpenId());
        contentIdeaRepo.save(idea);
        return gateway.fetchContentIdeaById(idea.getId());
    }

    @Transactional
    public JsonNode patchContentIdea(long id, Map<String, Object> patch) {
        return gateway.updateContentIdea(id, patch);
    }

    @Transactional(readOnly = true)
    public JsonNode getContentIdea(long id) {
        JsonNode rows = gateway.fetchContentIdeaById(id);
        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable.");
        }
        return rows.get(0);
    }

    @Transactional(readOnly = true)
    public JsonNode getTikTokAccountByOpenId(String openId) {
        return gateway.findTikTokAccountsByOpenId(openId);
    }

    @Transactional
    public JsonNode patchTikTokAccount(long id, Map<String, Object> patch) {
        TikTokAccount account = tiktokAccountRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "compte TikTok introuvable."));
        patch.forEach((key, value) -> {
            String v = value == null ? null : value.toString();
            switch (key) {
                case "open_id" -> account.setOpenId(v);
                case "access_token" -> account.setAccessToken(v);
                case "refresh_token" -> account.setRefreshToken(v);
                case "scope" -> account.setScope(v);
                case "token_type" -> account.setTokenType(v);
                case "token_status" -> account.setTokenStatus(v == null ? null : TikTokAccount.TokenStatus.valueOf(v));
            }
        });
        tiktokAccountRepo.save(account);
        return gateway.findTikTokAccountsByOpenId(account.getOpenId());
    }
}

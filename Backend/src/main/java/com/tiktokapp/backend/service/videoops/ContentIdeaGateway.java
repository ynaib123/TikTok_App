package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.model.TikTokAccount;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import com.tiktokapp.backend.repository.TikTokAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Data gateway for content_ideas and tiktok_accounts. Backed by the local PostgreSQL
 * database via JPA. The legacy name (SupabaseVideoOpsGateway) referred to a
 * previous Supabase REST setup that has been fully replaced by Postgres + JPA.
 */
@Service
public class ContentIdeaGateway {

    private final ContentIdeaRepository contentIdeaRepo;
    private final TikTokAccountRepository tiktokAccountRepo;
    private final ObjectMapper objectMapper;

    public ContentIdeaGateway(
            ContentIdeaRepository contentIdeaRepo,
            TikTokAccountRepository tiktokAccountRepo,
            ObjectMapper objectMapper
    ) {
        this.contentIdeaRepo = contentIdeaRepo;
        this.tiktokAccountRepo = tiktokAccountRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public JsonNode fetchContentIdeas() {
        List<ContentIdea> ideas = contentIdeaRepo.findAllByOrderByIdDesc();
        return objectMapper.valueToTree(ideas.stream().map(this::toMap).toList());
    }

    @Transactional(readOnly = true)
    public JsonNode fetchContentIdeaById(long contentIdeaId) {
        return contentIdeaRepo.findById(contentIdeaId)
                .map(idea -> objectMapper.<JsonNode>valueToTree(List.of(toMap(idea))))
                .orElse(objectMapper.createArrayNode());
    }

    @Transactional(readOnly = true)
    public JsonNode fetchInitPublishContentIdea(long contentIdeaId) {
        return contentIdeaRepo.findById(contentIdeaId)
                .map(idea -> {
                    Map<String, Object> row = Map.of(
                            "id", idea.getId(),
                            "platform", orEmpty(idea.getPlatform()),
                            "caption", orEmpty(idea.getCaption()),
                            "shotstack_url", orEmpty(idea.getShotstackUrl()),
                            "final_video_status", orEmpty(idea.getFinalVideoStatus()),
                            "publish_status", orEmpty(idea.getPublishStatus()),
                            "tiktok_account_open_id", orEmpty(idea.getTiktokAccountOpenId())
                    );
                    return objectMapper.<JsonNode>valueToTree(List.of(row));
                })
                .orElse(objectMapper.createArrayNode());
    }

    @Transactional(readOnly = true)
    public JsonNode fetchTikTokAccounts() {
        List<TikTokAccount> accounts = tiktokAccountRepo.findAllByOrderByIdAsc();
        return objectMapper.valueToTree(accounts.stream().map(a -> Map.of(
                "id", a.getId(),
                "open_id", orEmpty(a.getOpenId()),
                "scope", orEmpty(a.getScope()),
                "token_type", orEmpty(a.getTokenType()),
                "token_status", a.getTokenStatus() == null ? "" : a.getTokenStatus().name(),
                "access_token_expires_at", instantOrEmpty(a.getAccessTokenExpiresAt())
        )).toList());
    }

    @Transactional(readOnly = true)
    public JsonNode fetchTikTokAccountsForEncryptionMigration() {
        List<TikTokAccount> accounts = tiktokAccountRepo.findAllByOrderByIdAsc();
        return objectMapper.valueToTree(accounts.stream().map(a -> Map.of(
                "id", a.getId(),
                "open_id", orEmpty(a.getOpenId()),
                "access_token", orEmpty(a.getAccessToken()),
                "refresh_token", orEmpty(a.getRefreshToken())
        )).toList());
    }

    @Transactional(readOnly = true)
    public JsonNode findTikTokAccountsByOpenId(String openId) {
        return tiktokAccountRepo.findFirstByOpenId(openId)
                .map(a -> objectMapper.<JsonNode>valueToTree(List.of(toAccountMap(a))))
                .orElse(objectMapper.createArrayNode());
    }

    @Transactional
    public JsonNode updateContentIdea(long contentIdeaId, Map<String, Object> payload) {
        ContentIdea idea = contentIdeaRepo.findById(contentIdeaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable."));
        applyContentIdeaPatch(idea, payload);
        contentIdeaRepo.save(idea);
        return objectMapper.valueToTree(List.of(toMap(idea)));
    }

    @Transactional
    public JsonNode createTikTokAccount(Map<String, Object> payload) {
        TikTokAccount account = new TikTokAccount();
        applyTikTokAccountPatch(account, payload);
        tiktokAccountRepo.save(account);
        return objectMapper.valueToTree(List.of(toAccountMap(account)));
    }

    @Transactional
    public JsonNode updateTikTokAccount(long accountId, Map<String, Object> payload) {
        TikTokAccount account = tiktokAccountRepo.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "compte TikTok introuvable."));
        applyTikTokAccountPatch(account, payload);
        tiktokAccountRepo.save(account);
        return objectMapper.valueToTree(List.of(toAccountMap(account)));
    }

    @Transactional
    public void deleteTikTokAccount(long accountId) {
        tiktokAccountRepo.deleteById(accountId);
    }

    private void applyContentIdeaPatch(ContentIdea idea, Map<String, Object> patch) {
        patch.forEach((key, value) -> {
            String v = value == null ? null : value.toString();
            switch (key) {
                case "category" -> idea.setCategory(v);
                case "topic" -> idea.setTopic(v);
                case "scripts" -> idea.setScripts(v);
                case "script_status" -> idea.setScriptStatus(v);
                case "caption" -> idea.setCaption(v);
                case "background_keyword" -> idea.setBackgroundKeyword(v);
                case "status" -> idea.setStatus(v);
                case "pipeline_status" -> idea.setPipelineStatus(v);
                case "publish_status" -> idea.setPublishStatus(v);
                case "platform" -> idea.setPlatform(v);
                case "final_video_status" -> idea.setFinalVideoStatus(v);
                case "shotstack_status" -> idea.setShotstackStatus(v);
                case "shotstack_url" -> idea.setShotstackUrl(v);
                case "shotstack_render_id" -> idea.setShotstackRenderId(v);
                case "render_payload" -> idea.setRenderPayload(v);
                case "render_status" -> idea.setRenderStatus(v);
                case "tiktok_account_open_id" -> idea.setTiktokAccountOpenId(v);
                case "template_id" -> idea.setTemplateId(v);
                case "tiktok_publish_id" -> idea.setTiktokPublishId(v);
                case "tiktok_upload_url" -> idea.setTiktokUploadUrl(v);
                case "tiktok_upload_status" -> idea.setTiktokUploadStatus(v);
                case "tiktok_check_status" -> idea.setTiktokCheckStatus(v);
                case "uploaded_at" -> idea.setUploadedAt(v == null ? null : Instant.parse(v));
                case "published_at" -> idea.setPublishedAt(v == null ? null : Instant.parse(v));
            }
        });
    }

    private void applyTikTokAccountPatch(TikTokAccount account, Map<String, Object> patch) {
        patch.forEach((key, value) -> {
            String v = value == null ? null : value.toString();
            switch (key) {
                case "open_id" -> account.setOpenId(v);
                case "access_token" -> account.setAccessToken(v);
                case "refresh_token" -> account.setRefreshToken(v);
                case "scope" -> account.setScope(v);
                case "token_type" -> account.setTokenType(v);
                case "token_status" -> account.setTokenStatus(v == null ? null : TikTokAccount.TokenStatus.valueOf(v));
                case "access_token_expires_at" -> account.setAccessTokenExpiresAt(v == null ? null : Instant.parse(v));
                case "refresh_token_expires_at" -> account.setRefreshTokenExpiresAt(v == null ? null : Instant.parse(v));
                case "last_token_refresh_at" -> account.setLastTokenRefreshAt(v == null ? null : Instant.parse(v));
                case "last_token_refresh_error" -> account.setLastTokenRefreshError(v);
            }
        });
    }

    private Map<String, Object> toMap(ContentIdea idea) {
        java.util.LinkedHashMap<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", idea.getId());
        map.put("category", orEmpty(idea.getCategory()));
        map.put("topic", orEmpty(idea.getTopic()));
        map.put("scripts", orEmpty(idea.getScripts()));
        map.put("script_status", orEmpty(idea.getScriptStatus()));
        map.put("caption", orEmpty(idea.getCaption()));
        map.put("background_keyword", orEmpty(idea.getBackgroundKeyword()));
        map.put("status", orEmpty(idea.getStatus()));
        map.put("pipeline_status", orEmpty(idea.getPipelineStatus()));
        map.put("publish_status", orEmpty(idea.getPublishStatus()));
        map.put("platform", orEmpty(idea.getPlatform()));
        map.put("final_video_status", orEmpty(idea.getFinalVideoStatus()));
        map.put("shotstack_status", orEmpty(idea.getShotstackStatus()));
        map.put("shotstack_url", orEmpty(idea.getShotstackUrl()));
        map.put("shotstack_render_id", orEmpty(idea.getShotstackRenderId()));
        map.put("render_payload", orEmpty(idea.getRenderPayload()));
        map.put("render_status", orEmpty(idea.getRenderStatus()));
        map.put("tiktok_account_open_id", orEmpty(idea.getTiktokAccountOpenId()));
        map.put("template_id", orEmpty(idea.getTemplateId()));
        map.put("tiktok_publish_id", orEmpty(idea.getTiktokPublishId()));
        map.put("tiktok_upload_url", orEmpty(idea.getTiktokUploadUrl()));
        map.put("tiktok_upload_status", orEmpty(idea.getTiktokUploadStatus()));
        map.put("tiktok_check_status", orEmpty(idea.getTiktokCheckStatus()));
        return map;
    }

    private Map<String, Object> toAccountMap(TikTokAccount a) {
        java.util.LinkedHashMap<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", a.getId());
        map.put("open_id", orEmpty(a.getOpenId()));
        map.put("scope", orEmpty(a.getScope()));
        map.put("token_type", orEmpty(a.getTokenType()));
        map.put("access_token", orEmpty(a.getAccessToken()));
        map.put("refresh_token", orEmpty(a.getRefreshToken()));
        map.put("token_status", a.getTokenStatus() == null ? "" : a.getTokenStatus().name());
        map.put("access_token_expires_at", instantOrEmpty(a.getAccessTokenExpiresAt()));
        map.put("refresh_token_expires_at", instantOrEmpty(a.getRefreshTokenExpiresAt()));
        map.put("last_token_refresh_at", instantOrEmpty(a.getLastTokenRefreshAt()));
        map.put("last_token_refresh_error", orEmpty(a.getLastTokenRefreshError()));
        return map;
    }

    private String orEmpty(String value) {
        return value == null ? "" : value;
    }

    private String instantOrEmpty(Instant value) {
        return value == null ? "" : value.toString();
    }
}

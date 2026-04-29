package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaStatusResponse;
import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoStatCardResponse;
import com.tiktokapp.backend.dto.videoops.VideoStatusGroupResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoPipelineEvent;
import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoPipelineState;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.tiktokapp.backend.repository.VideoPipelineEventRepository;
import com.tiktokapp.backend.repository.VideoPipelineStateRepository;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import com.tiktokapp.backend.service.TikTokUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class VideoOpsService {

    private static final Logger logger = LoggerFactory.getLogger(VideoOpsService.class);

    private final SupabaseVideoOpsGateway supabaseGateway;
    private final N8nWorkflowGateway n8nWorkflowGateway;
    private final TikTokUploadService tikTokUploadService;
    private final VideoOpsCallbackAuthService callbackAuthService;
    private final VideoPipelineStateRepository pipelineStateRepository;
    private final VideoWorkflowRunRepository workflowRunRepository;
    private final VideoPipelineEventRepository eventRepository;
    private final VideoOpsProperties properties;
    private final ObjectMapper objectMapper;

    public VideoOpsService(
            SupabaseVideoOpsGateway supabaseGateway,
            N8nWorkflowGateway n8nWorkflowGateway,
            TikTokUploadService tikTokUploadService,
            VideoOpsCallbackAuthService callbackAuthService,
            VideoPipelineStateRepository pipelineStateRepository,
            VideoWorkflowRunRepository workflowRunRepository,
            VideoPipelineEventRepository eventRepository,
            VideoOpsProperties properties,
            ObjectMapper objectMapper
    ) {
        this.supabaseGateway = supabaseGateway;
        this.n8nWorkflowGateway = n8nWorkflowGateway;
        this.tikTokUploadService = tikTokUploadService;
        this.callbackAuthService = callbackAuthService;
        this.pipelineStateRepository = pipelineStateRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.eventRepository = eventRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<VideoContentIdeaResponse> fetchContentIdeas() {
        JsonNode rows = supabaseGateway.fetchContentIdeas();
        List<Long> contentIdeaIds = new ArrayList<>();
        rows.forEach(row -> contentIdeaIds.add(row.path("id").asLong()));
        Map<Long, VideoPipelineState> stateByIdeaId = pipelineStateRepository.findByContentIdeaIdIn(contentIdeaIds).stream()
                .collect(Collectors.toMap(VideoPipelineState::getContentIdeaId, state -> state));

        List<VideoContentIdeaResponse> contentIdeas = new ArrayList<>();
        rows.forEach(row -> {
            Long ideaId = row.path("id").asLong();
            VideoPipelineState state = stateByIdeaId.get(ideaId);
            String shotstackStatus = text(row, "shotstack_status", "unknown");
            String tiktokStatus = text(row, "publish_status", "draft");
            String finalVideoStatus = text(row, "final_video_status", "unknown");
            String shotstackUrl = text(row, "shotstack_url", "");
            String uploadUrl = text(row, "tiktok_upload_url", "");
            VideoPipelineStage stage = VideoOpsStateMachine.resolveFromContentSignals(
                    shotstackStatus,
                    tiktokStatus,
                    finalVideoStatus,
                    shotstackUrl,
                    uploadUrl,
                    state != null ? state.getPipelineStage() : VideoPipelineStage.UNKNOWN
            );
            contentIdeas.add(new VideoContentIdeaResponse(
                    ideaId,
                    text(row, "category", ""),
                    text(row, "topic", ""),
                    text(row, "scripts", ""),
                    text(row, "caption", ""),
                    text(row, "background_keyword", ""),
                    shotstackStatus,
                    tiktokStatus,
                    finalVideoStatus,
                    shotstackUrl,
                    uploadUrl,
                    text(row, "tiktok_account_open_id", ""),
                    stage.name().toLowerCase(Locale.ROOT),
                    state != null ? state.getLastErrorMessage() : null
            ));
        });
        return contentIdeas;
    }

    @Transactional(readOnly = true)
    public List<TikTokAccountResponse> fetchTikTokAccounts() {
        JsonNode rows = supabaseGateway.fetchTikTokAccounts();
        List<TikTokAccountResponse> accounts = new ArrayList<>();
        rows.forEach(row -> {
            String openId = text(row, "open_id", "");
            String tokenType = text(row, "token_type", "");
            String scope = text(row, "scope", "");
            boolean hasOauthData = !isBlank(openId)
                    || !isBlank(tokenType)
                    || !isBlank(scope);

            if (!hasOauthData) {
                return;
            }

            accounts.add(new TikTokAccountResponse(
                    row.path("id").asLong(),
                    "account-" + row.path("id").asLong(),
                    openId,
                    scope,
                    "sandbox",
                    "connected"
            ));
        });
        return accounts;
    }

    @Transactional(readOnly = true)
    public VideoContentIdeaStatusResponse fetchContentIdeaStatus(long contentIdeaId) {
        JsonNode rows = supabaseGateway.fetchContentIdeaById(contentIdeaId);
        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable.");
        }

        JsonNode row = rows.get(0);
        VideoPipelineState state = pipelineStateRepository.findById(contentIdeaId).orElse(null);
        VideoWorkflowRun lastRun = workflowRunRepository.findTopByContentIdeaIdOrderByCreatedAtDesc(contentIdeaId).orElse(null);
        VideoPipelineEvent lastEvent = eventRepository.findTopByContentIdeaIdOrderByCreatedAtDesc(contentIdeaId);
        VideoPipelineStage stage = VideoOpsStateMachine.resolveFromContentSignals(
                text(row, "shotstack_status", "unknown"),
                text(row, "publish_status", "draft"),
                text(row, "final_video_status", "unknown"),
                text(row, "shotstack_url", ""),
                text(row, "tiktok_upload_url", ""),
                state != null ? state.getPipelineStage() : VideoPipelineStage.UNKNOWN
        );

        return new VideoContentIdeaStatusResponse(
                contentIdeaId,
                text(row, "topic", ""),
                stage.name(),
                VideoOpsStateMachine.describe(stage),
                text(row, "shotstack_status", ""),
                text(row, "final_video_status", ""),
                text(row, "publish_status", ""),
                text(row, "tiktok_upload_status", ""),
                text(row, "tiktok_account_open_id", ""),
                text(row, "shotstack_url", ""),
                text(row, "tiktok_upload_url", ""),
                state == null ? null : state.getLastErrorMessage(),
                lastRun == null ? null : new VideoWorkflowRunDetailResponse(
                        lastRun.getId(),
                        lastRun.getContentIdeaId(),
                        lastRun.getWorkflowType().name(),
                        lastRun.getStatus().name(),
                        lastRun.getAttemptNumber(),
                        lastRun.getErrorMessage(),
                        lastRun.getResponsePayload(),
                        lastRun.getCreatedAt() == null ? null : lastRun.getCreatedAt().toString(),
                        lastRun.getCompletedAt() == null ? null : lastRun.getCompletedAt().toString()
                ),
                lastEvent == null ? null : lastEvent.getMessage(),
                lastEvent == null ? null : lastEvent.getSeverity(),
                state == null || state.getUpdatedAt() == null ? null : state.getUpdatedAt().toString()
        );
    }

    @Transactional(readOnly = true)
    public List<VideoManualActionResponse> fetchManualActions() {
        return fetchContentIdeas().stream()
                .filter(item -> !item.getShotstackUrl().isBlank()
                        || !item.getUploadUrl().isBlank()
                        || "ready".equalsIgnoreCase(item.getFinalVideoStatus())
                        || "uploaded".equalsIgnoreCase(item.getTiktokStatus())
                        || "uploading".equalsIgnoreCase(item.getTiktokStatus())
                        || "published".equalsIgnoreCase(item.getTiktokStatus()))
                .map(item -> new VideoManualActionResponse(
                        item.getId(),
                        item.getTopic(),
                        item.getShotstackUrl(),
                        item.getUploadUrl(),
                        item.getUploadUrl().isBlank() ? "pending_init_publish" : "init_done",
                        item.getTiktokStatus(),
                        item.getFinalVideoStatus(),
                        item.getShotstackStatus(),
                        item.getPipelineStatus(),
                        item.getLastError()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public VideoDashboardResponse fetchDashboard() {
        List<VideoContentIdeaResponse> ideas = fetchContentIdeas();
        int renderingCount = (int) ideas.stream()
                .filter(item -> List.of("queued", "rendering", "preprocessing").contains(item.getShotstackStatus()))
                .count();
        int readyCount = (int) ideas.stream()
                .filter(item -> "ready".equalsIgnoreCase(item.getFinalVideoStatus()))
                .count();
        int uploadQueueCount = (int) ideas.stream()
                .filter(item -> List.of("uploaded", "uploading").contains(lower(item.getTiktokStatus())) || !item.getUploadUrl().isBlank())
                .count();
        int publishedCount = (int) ideas.stream()
                .filter(item -> "published".equalsIgnoreCase(item.getTiktokStatus()))
                .count();

        List<VideoWorkflowRunResponse> recentRuns = workflowRunRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(run -> new VideoWorkflowRunResponse(
                        run.getId(),
                        run.getContentIdeaId(),
                        run.getWorkflowType().name(),
                        run.getStatus().name(),
                        run.getAttemptNumber(),
                        run.getErrorMessage(),
                        run.getCreatedAt().toString()
                ))
                .toList();

        return new VideoDashboardResponse(
                List.of(
                        new VideoStatCardResponse("Content Ideas", String.valueOf(ideas.size()), "neutral"),
                        new VideoStatCardResponse("Renders In Progress", String.valueOf(renderingCount), "accent"),
                        new VideoStatCardResponse("Ready To Publish", String.valueOf(readyCount), "success"),
                        new VideoStatCardResponse("Manual Upload Queue", String.valueOf(uploadQueueCount), "warning")
                ),
                List.of(
                        new VideoStatusGroupResponse("Queued", (int) ideas.stream().filter(item -> "queued".equalsIgnoreCase(item.getShotstackStatus())).count()),
                        new VideoStatusGroupResponse("Rendering", renderingCount),
                        new VideoStatusGroupResponse("Ready", readyCount),
                        new VideoStatusGroupResponse("Published", publishedCount)
                ),
                recentRuns
        );
    }

    @Transactional(readOnly = true)
    public VideoWorkflowRunDetailResponse fetchWorkflowRun(long runId) {
        VideoWorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "workflowRun introuvable."));

        return new VideoWorkflowRunDetailResponse(
                run.getId(),
                run.getContentIdeaId(),
                run.getWorkflowType().name(),
                run.getStatus().name(),
                run.getAttemptNumber(),
                run.getErrorMessage(),
                run.getResponsePayload(),
                run.getCreatedAt() == null ? null : run.getCreatedAt().toString(),
                run.getCompletedAt() == null ? null : run.getCompletedAt().toString()
        );
    }

    @Transactional
    public VideoWorkflowActionResponse triggerMainPipeline(WorkflowTriggerRequest request, String requestedByEmail) {
        validateMainPipelineRequest(request);
        return triggerWorkflow(VideoWorkflowType.MAIN_PIPELINE, null, request, requestedByEmail, VideoOpsStateMachine.requestedStage(VideoWorkflowType.MAIN_PIPELINE));
    }

    @Transactional
    public VideoWorkflowActionResponse triggerCheckShotstack(WorkflowTriggerRequest request, String requestedByEmail) {
        Long contentIdeaId = requireContentIdeaId(request.getContentIdeaId(), "contentIdeaId est obligatoire pour le render.");
        return triggerWorkflow(VideoWorkflowType.CHECK_SHOTSTACK, contentIdeaId, request, requestedByEmail, VideoOpsStateMachine.requestedStage(VideoWorkflowType.CHECK_SHOTSTACK));
    }

    @Transactional
    public VideoWorkflowActionResponse triggerRenderTemplate(WorkflowTriggerRequest request, String requestedByEmail) {
        Long contentIdeaId = requireContentIdeaId(request.getContentIdeaId(), "contentIdeaId est obligatoire pour le rendu video.");
        return triggerWorkflow(VideoWorkflowType.RENDER_TEMPLATE_VIDEO, contentIdeaId, request, requestedByEmail, VideoOpsStateMachine.requestedStage(VideoWorkflowType.RENDER_TEMPLATE_VIDEO));
    }

    @Transactional
    public VideoWorkflowActionResponse triggerInitPublish(WorkflowTriggerRequest request, String requestedByEmail) {
        Long contentIdeaId = requireContentIdeaId(request.getContentIdeaId(), "contentIdeaId est obligatoire pour l'init publish.");
        return triggerWorkflow(VideoWorkflowType.INIT_PUBLISH_TIKTOK, contentIdeaId, request, requestedByEmail, VideoOpsStateMachine.requestedStage(VideoWorkflowType.INIT_PUBLISH_TIKTOK));
    }

    @Transactional
    public TikTokUploadResponse uploadTikTokMedia(long contentIdeaId, String shotstackUrl, String uploadUrl, boolean force, String requestedByEmail) {
        validateAllowedHost(shotstackUrl, properties.getAllowedShotstackHosts(), "shotstackUrl");
        validateAllowedHost(uploadUrl, properties.getAllowedUploadHosts(), "uploadUrl");

        VideoWorkflowRun existingRun = findReusableRun(contentIdeaId, VideoWorkflowType.TIKTOK_UPLOAD, force)
                .orElse(null);
        if (existingRun != null) {
            return new TikTokUploadResponse(
                    true,
                    200,
                    0,
                    "Upload deja execute recemment sous le run " + existingRun.getId() + "."
            );
        }

        VideoWorkflowRun run = createRun(
                contentIdeaId,
                VideoWorkflowType.TIKTOK_UPLOAD,
                requestedByEmail,
                force,
                Map.of("contentIdeaId", contentIdeaId, "shotstackUrl", shotstackUrl, "uploadUrl", uploadUrl),
                nextAttemptNumber(contentIdeaId, VideoWorkflowType.TIKTOK_UPLOAD)
        );
        syncPipelineState(contentIdeaId, VideoOpsStateMachine.requestedStage(VideoWorkflowType.TIKTOK_UPLOAD), null, run);
        recordEvent(contentIdeaId, run, "INFO", "upload_started", "Upload TikTok lance depuis le backend.", Map.of("runId", run.getId()));
        logWorkflowInfo("upload_started", run, "Upload TikTok lance depuis le backend.");

        try {
            TikTokUploadResponse response = tikTokUploadService.uploadFromShotstack(shotstackUrl, uploadUrl);
            supabaseGateway.updateContentIdea(contentIdeaId, Map.of(
                    "tiktok_upload_status", "uploaded",
                    "publish_status", "uploaded",
                    "uploaded_at", Instant.now().toString()
            ));
            markRunSucceeded(run, responseBody(response));
            syncPipelineState(contentIdeaId, VideoOpsStateMachine.successStage(VideoWorkflowType.TIKTOK_UPLOAD, currentStage(contentIdeaId)), null, run);
            recordEvent(contentIdeaId, run, "INFO", "upload_succeeded", "Upload TikTok termine.", Map.of("statusCode", response.getStatusCode()));
            logWorkflowInfo("upload_succeeded", run, "Upload TikTok termine.");
            return response;
        } catch (RuntimeException exception) {
            markRunFailed(run, exception.getMessage());
            syncPipelineState(contentIdeaId, VideoOpsStateMachine.failureStage(), exception.getMessage(), run);
            recordEvent(contentIdeaId, run, "ERROR", "upload_failed", "Upload TikTok en echec.", payloadOf("error", exception.getMessage()));
            logWorkflowWarn("upload_failed", run, exception.getMessage());
            throw exception;
        }
    }

    @Transactional
    public VideoWorkflowActionResponse markPublishComplete(long contentIdeaId, String requestedByEmail) {
        VideoWorkflowRun run = createRun(
                contentIdeaId,
                VideoWorkflowType.FINALIZE_PUBLISH,
                requestedByEmail,
                false,
                Map.of("contentIdeaId", contentIdeaId),
                nextAttemptNumber(contentIdeaId, VideoWorkflowType.FINALIZE_PUBLISH)
        );

        try {
            supabaseGateway.updateContentIdea(contentIdeaId, Map.of(
                    "publish_status", "published",
                    "tiktok_check_status", "PUBLISH_COMPLETE",
                    "published_at", Instant.now().toString()
            ));
            markRunSucceeded(run, "{\"result\":\"published\"}");
            syncPipelineState(contentIdeaId, VideoOpsStateMachine.successStage(VideoWorkflowType.FINALIZE_PUBLISH, currentStage(contentIdeaId)), null, run);
            recordEvent(contentIdeaId, run, "INFO", "publish_completed", "Publication finale marquee comme complete.", Map.of("contentIdeaId", contentIdeaId));
            logWorkflowInfo("publish_completed", run, "Publication finale marquee comme complete.");
            return new VideoWorkflowActionResponse(run.getId(), contentIdeaId, run.getWorkflowType().name(), run.getStatus().name(), "Publication finale enregistree.", false);
        } catch (RuntimeException exception) {
            markRunFailed(run, exception.getMessage());
            syncPipelineState(contentIdeaId, VideoOpsStateMachine.failureStage(), exception.getMessage(), run);
            recordEvent(contentIdeaId, run, "ERROR", "publish_failed", "La finalisation de publication a echoue.", payloadOf("error", exception.getMessage()));
            logWorkflowWarn("publish_failed", run, exception.getMessage());
            throw exception;
        }
    }

    @Transactional
    public VideoWorkflowRunDetailResponse completeWorkflowRun(long runId, VideoWorkflowRunCompletionRequest request) {
        VideoWorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "workflowRun introuvable."));

        VideoWorkflowRunStatus nextStatus;
        try {
            nextStatus = VideoWorkflowRunStatus.valueOf(String.valueOf(request.getStatus()).trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status workflow invalide.");
        }

        if (nextStatus != VideoWorkflowRunStatus.SUCCEEDED && nextStatus != VideoWorkflowRunStatus.FAILED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status workflow doit etre SUCCEEDED ou FAILED.");
        }

        run.setStatus(nextStatus);
        run.setCompletedAt(Instant.now());
        if (request.getResponsePayload() != null && !request.getResponsePayload().isBlank()) {
            run.setResponsePayload(trimToNull(request.getResponsePayload()));
        }
        if (nextStatus == VideoWorkflowRunStatus.FAILED) {
            String errorMessage = trimToNull(request.getErrorMessage());
            run.setErrorMessage(errorMessage == null ? "Workflow externe en echec." : errorMessage);
            syncPipelineState(run.getContentIdeaId(), VideoOpsStateMachine.failureStage(), run.getErrorMessage(), run);
            recordEvent(
                    run.getContentIdeaId(),
                    run,
                    "ERROR",
                    "workflow_callback_failed",
                    request.getMessage() == null || request.getMessage().isBlank() ? "Workflow externe signale en echec." : request.getMessage(),
                    payloadOf("error", run.getErrorMessage())
            );
            logWorkflowWarn("workflow_callback_failed", run, run.getErrorMessage());
        } else {
            run.setErrorMessage(null);
            syncPipelineState(
                    run.getContentIdeaId(),
                    VideoOpsStateMachine.successStage(run.getWorkflowType(), currentStage(run.getContentIdeaId())),
                    null,
                    run
            );
            recordEvent(
                    run.getContentIdeaId(),
                    run,
                    "INFO",
                    "workflow_callback_succeeded",
                    request.getMessage() == null || request.getMessage().isBlank() ? "Workflow externe termine avec succes." : request.getMessage(),
                    Map.of("runId", run.getId())
            );
            logWorkflowInfo("workflow_callback_succeeded", run, request.getMessage() == null ? "Workflow externe termine avec succes." : request.getMessage());
        }
        workflowRunRepository.save(run);

        return fetchWorkflowRun(runId);
    }

    public void validateWorkflowCallbackRequest(String method, String path, String body, String timestamp, String signature, String legacySecret) {
        callbackAuthService.validateCallback(method, path, body, timestamp, signature, legacySecret);
    }

    private VideoWorkflowActionResponse triggerWorkflow(
            VideoWorkflowType workflowType,
            Long contentIdeaId,
            WorkflowTriggerRequest request,
            String requestedByEmail,
            VideoPipelineStage nextStage
    ) {
        boolean force = Boolean.TRUE.equals(request.getForce());
        VideoWorkflowRun existingRun = findReusableRun(contentIdeaId, workflowType, force).orElse(null);
        if (existingRun != null) {
            recordEvent(contentIdeaId, existingRun, "INFO", "workflow_reused", "Requete idempotente reusee.", Map.of("runId", existingRun.getId()));
            logWorkflowInfo("workflow_reused", existingRun, "Requete idempotente reusee.");
            return new VideoWorkflowActionResponse(
                    existingRun.getId(),
                    contentIdeaId,
                    workflowType.name(),
                    existingRun.getStatus().name(),
                    "Requete deja acceptee recemment.",
                    true
            );
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("contentIdeaId", contentIdeaId);
        payload.put("category", trimToNull(request.getCategory()));
        payload.put("ideaCount", normalizeIdeaCount(request.getIdeaCount()));
        payload.put("topic", request.getTopic());
        payload.put("script", trimToNull(request.getScript()));
        payload.put("caption", trimToNull(request.getCaption()));
        payload.put("keyword", trimToNull(request.getKeyword()));
        payload.put("tiktokAccountOpenId", trimToNull(request.getTiktokAccountOpenId()));
        payload.put("source", request.getSource());
        payload.put("force", force);
        payload.put("requestedBy", requestedByEmail);
        payload.put("requestedAt", Instant.now().toString());

        VideoWorkflowRun run = createRun(
                contentIdeaId,
                workflowType,
                requestedByEmail,
                force,
                payload,
                nextAttemptNumber(contentIdeaId, workflowType)
        );
        syncPipelineState(contentIdeaId, nextStage, null, run);
        recordEvent(contentIdeaId, run, "INFO", "workflow_requested", "Workflow " + workflowType + " demande.", payload);
        logWorkflowInfo("workflow_requested", run, "Workflow " + workflowType + " demande.");

        try {
            JsonNode response = n8nWorkflowGateway.trigger(workflowType, payloadWithRunMetadata(payload, run));
            markRunAccepted(run, json(response));
            recordEvent(contentIdeaId, run, "INFO", "workflow_accepted", "Workflow " + workflowType + " accepte par n8n.", Map.of("runId", run.getId()));
            logWorkflowInfo("workflow_accepted", run, "Workflow " + workflowType + " accepte par n8n.");
            return new VideoWorkflowActionResponse(
                    run.getId(),
                    contentIdeaId,
                    workflowType.name(),
                    run.getStatus().name(),
                    "Workflow accepte et trace par le backend.",
                    false
            );
        } catch (RuntimeException exception) {
            markRunFailed(run, exception.getMessage());
            syncPipelineState(contentIdeaId, VideoOpsStateMachine.failureStage(), exception.getMessage(), run);
            recordEvent(contentIdeaId, run, "ERROR", "workflow_failed", "Workflow " + workflowType + " en echec.", payloadOf("error", exception.getMessage()));
            logWorkflowWarn("workflow_failed", run, exception.getMessage());
            throw exception;
        }
    }

    private Optional<VideoWorkflowRun> findReusableRun(Long contentIdeaId, VideoWorkflowType workflowType, boolean force) {
        if (force) {
            return Optional.empty();
        }

        Optional<VideoWorkflowRun> candidate = contentIdeaId == null
                ? workflowRunRepository.findTopByContentIdeaIdIsNullAndWorkflowTypeOrderByCreatedAtDesc(workflowType)
                : workflowRunRepository.findTopByContentIdeaIdAndWorkflowTypeOrderByCreatedAtDesc(contentIdeaId, workflowType);

        if (candidate.isEmpty()) {
            return Optional.empty();
        }

        VideoWorkflowRun run = candidate.get();
        if (run.getStatus() == VideoWorkflowRunStatus.FAILED) {
            return Optional.empty();
        }

        Instant cutoff = Instant.now().minusSeconds(properties.getIdempotencyWindowSeconds());
        return run.getCreatedAt().isAfter(cutoff) ? Optional.of(run) : Optional.empty();
    }

    private int nextAttemptNumber(Long contentIdeaId, VideoWorkflowType workflowType) {
        long count = contentIdeaId == null
                ? workflowRunRepository.countByContentIdeaIdIsNullAndWorkflowType(workflowType)
                : workflowRunRepository.countByContentIdeaIdAndWorkflowType(contentIdeaId, workflowType);
        return Math.toIntExact(count + 1);
    }

    private VideoWorkflowRun createRun(
            Long contentIdeaId,
            VideoWorkflowType workflowType,
            String requestedByEmail,
            boolean force,
            Map<String, Object> payload,
            int attemptNumber
    ) {
        VideoWorkflowRun run = new VideoWorkflowRun();
        run.setContentIdeaId(contentIdeaId);
        run.setWorkflowType(workflowType);
        run.setRequestedByEmail(requestedByEmail);
        run.setForceRequested(force);
        run.setAttemptNumber(attemptNumber);
        run.setIdempotencyKey(buildIdempotencyKey(contentIdeaId, workflowType));
        run.setRequestPayload(json(payload));
        return workflowRunRepository.save(run);
    }

    private String buildIdempotencyKey(Long contentIdeaId, VideoWorkflowType workflowType) {
        return workflowType.name() + ":" + (contentIdeaId == null ? "global" : contentIdeaId);
    }

    private void markRunAccepted(VideoWorkflowRun run, String responsePayload) {
        run.setStatus(VideoWorkflowRunStatus.ACCEPTED);
        run.setResponsePayload(responsePayload);
        run.setCompletedAt(Instant.now());
        workflowRunRepository.save(run);
    }

    private void markRunSucceeded(VideoWorkflowRun run, String responsePayload) {
        run.setStatus(VideoWorkflowRunStatus.SUCCEEDED);
        run.setResponsePayload(responsePayload);
        run.setCompletedAt(Instant.now());
        workflowRunRepository.save(run);
    }

    private void markRunFailed(VideoWorkflowRun run, String errorMessage) {
        run.setStatus(VideoWorkflowRunStatus.FAILED);
        run.setErrorMessage(trimToNull(errorMessage));
        run.setCompletedAt(Instant.now());
        workflowRunRepository.save(run);
    }

    private void syncPipelineState(Long contentIdeaId, VideoPipelineStage stage, String lastError, VideoWorkflowRun run) {
        if (contentIdeaId == null) {
            return;
        }

        VideoPipelineState state = pipelineStateRepository.findById(contentIdeaId).orElseGet(() -> {
            VideoPipelineState next = new VideoPipelineState();
            next.setContentIdeaId(contentIdeaId);
            return next;
        });
        VideoPipelineStage currentStage = state.getPipelineStage();
        if (VideoOpsStateMachine.canTransition(currentStage, stage)) {
            state.setPipelineStage(stage);
        }
        state.setLastWorkflowType(run.getWorkflowType());
        state.setLastWorkflowRunId(run.getId());
        state.setLastErrorMessage(trimToNull(lastError));
        pipelineStateRepository.save(state);
    }

    private void recordEvent(Long contentIdeaId, VideoWorkflowRun run, String severity, String eventType, String message, Map<String, Object> payload) {
        VideoPipelineEvent event = new VideoPipelineEvent();
        event.setContentIdeaId(contentIdeaId);
        event.setWorkflowRunId(run != null ? run.getId() : null);
        event.setSeverity(severity);
        event.setEventType(eventType);
        event.setMessage(message);
        event.setPayloadJson(json(payload));
        eventRepository.save(event);
    }

    private Map<String, Object> payloadWithRunMetadata(Map<String, Object> payload, VideoWorkflowRun run) {
        Map<String, Object> nextPayload = new LinkedHashMap<>(payload);
        nextPayload.put("workflowRunId", run.getId());
        nextPayload.put("attemptNumber", run.getAttemptNumber());
        nextPayload.put("idempotencyKey", run.getIdempotencyKey());
        return nextPayload;
    }

    private VideoPipelineStage currentStage(Long contentIdeaId) {
        if (contentIdeaId == null) {
            return VideoPipelineStage.UNKNOWN;
        }
        return pipelineStateRepository.findById(contentIdeaId)
                .map(VideoPipelineState::getPipelineStage)
                .orElse(VideoPipelineStage.UNKNOWN);
    }

    private void validateAllowedHost(String rawUrl, List<String> allowedHosts, String fieldName) {
        try {
            URI uri = URI.create(rawUrl);
            String scheme = lower(uri.getScheme());
            String host = lower(uri.getHost());
            if (!Objects.equals("https", scheme)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " doit utiliser HTTPS.");
            }
            boolean allowed = allowedHosts.stream()
                    .filter(Objects::nonNull)
                    .map(this::lower)
                    .anyMatch(allowedHost -> host != null && (host.equals(allowedHost) || host.endsWith("." + allowedHost)));
            if (!allowed) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " utilise un host non autorise.");
            }
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " n'est pas une URL valide.", exception);
        }
    }

    private Long requireContentIdeaId(Long contentIdeaId, String message) {
        if (contentIdeaId == null || contentIdeaId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return contentIdeaId;
    }

    private void validateMainPipelineRequest(WorkflowTriggerRequest request) {
        String category = trimToNull(request.getCategory());
        if (category == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "category est obligatoire pour la generation d idees.");
        }

        Integer ideaCount = request.getIdeaCount();
        if (ideaCount == null || ideaCount < 1 || ideaCount > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ideaCount doit etre compris entre 1 et 5.");
        }
    }

    private int normalizeIdeaCount(Integer ideaCount) {
        return ideaCount == null ? 1 : Math.max(1, Math.min(5, ideaCount));
    }

    private String text(JsonNode row, String fieldName, String fallback) {
        String value = row.path(fieldName).asText("");
        return value == null || value.isBlank() ? fallback : value;
    }

    private String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{\"error\":\"serialization_failed\"}";
        }
    }

    private String responseBody(TikTokUploadResponse response) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("success", response.isSuccess());
        payload.put("statusCode", response.getStatusCode());
        payload.put("uploadedBytes", response.getUploadedBytes());
        payload.put("responseBody", response.getResponseBody());
        return json(payload);
    }

    private Map<String, Object> payloadOf(String key, Object value) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put(key, value == null ? "" : value);
        return payload;
    }

    private void logWorkflowInfo(String eventType, VideoWorkflowRun run, String message) {
        logger.info(
                "video_ops event={} workflowRunId={} contentIdeaId={} workflowType={} attemptNumber={} status={} message={}",
                eventType,
                run == null ? null : run.getId(),
                run == null ? null : run.getContentIdeaId(),
                run == null || run.getWorkflowType() == null ? null : run.getWorkflowType().name(),
                run == null ? null : run.getAttemptNumber(),
                run == null || run.getStatus() == null ? null : run.getStatus().name(),
                message
        );
    }

    private void logWorkflowWarn(String eventType, VideoWorkflowRun run, String message) {
        logger.warn(
                "video_ops event={} workflowRunId={} contentIdeaId={} workflowType={} attemptNumber={} status={} message={}",
                eventType,
                run == null ? null : run.getId(),
                run == null ? null : run.getContentIdeaId(),
                run == null || run.getWorkflowType() == null ? null : run.getWorkflowType().name(),
                run == null ? null : run.getAttemptNumber(),
                run == null || run.getStatus() == null ? null : run.getStatus().name(),
                message
        );
    }
}

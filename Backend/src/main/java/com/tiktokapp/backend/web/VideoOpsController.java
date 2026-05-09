package com.tiktokapp.backend.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.AccountsOverviewResponse;
import com.tiktokapp.backend.dto.videoops.AlertNotifyRequest;
import com.tiktokapp.backend.dto.videoops.BatchPublishRequest;
import com.tiktokapp.backend.dto.videoops.BatchPublishResponse;
import com.tiktokapp.backend.dto.videoops.BulkDeleteContentIdeasRequest;
import io.micrometer.core.annotation.Timed;
import com.tiktokapp.backend.service.alerting.SlackAlertService;
import com.tiktokapp.backend.service.videoops.BatchPublishService;
import com.tiktokapp.backend.dto.videoops.AccountsReadinessResponse;
import com.tiktokapp.backend.dto.videoops.PexelsVideoSearchRequest;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionRequest;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextResponse;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaStatusResponse;
import com.tiktokapp.backend.dto.videoops.VideoOpsBootstrapResponse;
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoUploadRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.ContentIdeaCreateRequest;
import com.tiktokapp.backend.dto.videoops.ContentIdeaPatchRequest;
import com.tiktokapp.backend.service.videoops.AccountsService;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import com.tiktokapp.backend.service.videoops.VideoOpsDataService;
import com.tiktokapp.backend.service.videoops.TikTokInternalAccountContextService;
import com.tiktokapp.backend.service.videoops.TikTokInitPublishContextService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalProxyService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalAuthService;
import com.tiktokapp.backend.service.videoops.FailedCallbackQueue;
import com.tiktokapp.backend.config.WorkflowContract;
import com.tiktokapp.backend.service.AuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.HttpServletRequest;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/video-ops")
public class VideoOpsController {

    private static final Logger logger = LoggerFactory.getLogger(VideoOpsController.class);

    private final VideoOpsService videoOpsService;
    private final VideoOpsDataService videoOpsDataService;
    private final AccountsService accountsService;
    private final TikTokInternalAccountContextService tikTokInternalAccountContextService;
    private final TikTokInitPublishContextService tikTokInitPublishContextService;
    private final VideoOpsInternalProxyService videoOpsInternalProxyService;
    private final VideoOpsInternalAuthService internalAuthService;
    private final SlackAlertService slackAlertService;
    private final BatchPublishService batchPublishService;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;
    private final FailedCallbackQueue failedCallbackQueue;

    public VideoOpsController(
            VideoOpsService videoOpsService,
            VideoOpsDataService videoOpsDataService,
            AccountsService accountsService,
            TikTokInternalAccountContextService tikTokInternalAccountContextService,
            TikTokInitPublishContextService tikTokInitPublishContextService,
            VideoOpsInternalProxyService videoOpsInternalProxyService,
            VideoOpsInternalAuthService internalAuthService,
            SlackAlertService slackAlertService,
            BatchPublishService batchPublishService,
            ObjectMapper objectMapper,
            AuditService auditService,
            FailedCallbackQueue failedCallbackQueue
    ) {
        this.videoOpsService = videoOpsService;
        this.videoOpsDataService = videoOpsDataService;
        this.accountsService = accountsService;
        this.tikTokInternalAccountContextService = tikTokInternalAccountContextService;
        this.tikTokInitPublishContextService = tikTokInitPublishContextService;
        this.videoOpsInternalProxyService = videoOpsInternalProxyService;
        this.internalAuthService = internalAuthService;
        this.slackAlertService = slackAlertService;
        this.batchPublishService = batchPublishService;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
        this.failedCallbackQueue = failedCallbackQueue;
    }

    @GetMapping("/content-ideas")
    public ResponseEntity<Page<VideoContentIdeaResponse>> getContentIdeas(
            @PageableDefault(page = 0, size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(videoOpsService.fetchContentIdeas(pageable));
    }

    @GetMapping("/content-ideas/{contentIdeaId}/status")
    public ResponseEntity<VideoContentIdeaStatusResponse> getContentIdeaStatus(
            @PathVariable long contentIdeaId
    ) {
        return ResponseEntity.ok(videoOpsService.fetchContentIdeaStatus(contentIdeaId));
    }

    @GetMapping("/content-ideas/{contentIdeaId}")
    public ResponseEntity<VideoContentIdeaResponse> getContentIdea(
            @PathVariable long contentIdeaId
    ) {
        return ResponseEntity.ok(videoOpsService.fetchContentIdea(contentIdeaId));
    }

    @GetMapping("/manual-actions")
    public ResponseEntity<List<VideoManualActionResponse>> getManualActions() {
        return ResponseEntity.ok(videoOpsService.fetchManualActions());
    }

    @GetMapping("/tiktok-accounts")
    public ResponseEntity<List<TikTokAccountResponse>> getTikTokAccounts() {
        return ResponseEntity.ok(videoOpsService.fetchTikTokAccounts());
    }

    @GetMapping("/accounts")
    public ResponseEntity<AccountsOverviewResponse> getAccountsOverview() {
        return ResponseEntity.ok(accountsService.fetchOverview());
    }

    @GetMapping("/accounts/readiness")
    public ResponseEntity<AccountsReadinessResponse> getAccountsReadiness() {
        return ResponseEntity.ok(accountsService.fetchReadiness());
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<VideoOpsBootstrapResponse> getBootstrap(
            @PageableDefault(page = 0, size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        long startedAt = System.nanoTime();
        AccountsOverviewResponse accountsOverview = accountsService.fetchOverview();
        AccountsReadinessResponse accountsReadiness = accountsOverview.getReadiness() != null
                ? accountsOverview.getReadiness()
                : accountsService.fetchReadiness();

        VideoOpsBootstrapResponse response = new VideoOpsBootstrapResponse(
                accountsOverview,
                accountsReadiness,
                videoOpsService.fetchContentIdeas(pageable),
                videoOpsService.fetchManualActions()
        );
        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
        return ResponseEntity.ok()
                .header("Server-Timing", "videoops-bootstrap;dur=" + durationMs)
                .body(response);
    }

    @PutMapping("/accounts/services/{providerKey}")
    public ResponseEntity<ServiceConnectionResponse> upsertServiceConnection(
            @PathVariable String providerKey,
            @Valid @RequestBody ServiceConnectionRequest request
    ) {
        return ResponseEntity.ok(accountsService.upsertServiceConnection(providerKey, request));
    }

    @PostMapping("/accounts/services/{providerKey}/{connectionId}/activate")
    public ResponseEntity<ServiceConnectionResponse> activateServiceConnection(
            @PathVariable String providerKey,
            @PathVariable long connectionId
    ) {
        return ResponseEntity.ok(accountsService.activateServiceConnection(providerKey, connectionId));
    }

    @PostMapping("/accounts/services/{providerKey}/{connectionId}/validate")
    public ResponseEntity<ServiceConnectionResponse> validateServiceConnection(
            @PathVariable String providerKey,
            @PathVariable long connectionId
    ) {
        return ResponseEntity.ok(accountsService.validateServiceConnection(providerKey, connectionId));
    }

    @DeleteMapping("/accounts/services/{providerKey}")
    public ResponseEntity<Void> disconnectServiceConnection(@PathVariable String providerKey) {
        accountsService.disconnectServiceConnection(providerKey);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/accounts/services/{providerKey}/{connectionId}")
    public ResponseEntity<Void> deleteServiceConnection(
            @PathVariable String providerKey,
            @PathVariable long connectionId
    ) {
        accountsService.deleteServiceConnection(providerKey, connectionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/tiktok-accounts/{accountId}")
    public ResponseEntity<Void> disconnectTikTokAccount(@PathVariable long accountId) {
        accountsService.disconnectTikTokAccount(accountId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/content-ideas/{contentIdeaId}")
    @Timed(value = "video_ops.delete_content_idea", description = "Delete a single content idea", histogram = true)
    public ResponseEntity<Void> deleteContentIdea(@PathVariable long contentIdeaId, Authentication authentication) {
        videoOpsService.deleteContentIdea(contentIdeaId);
        auditService.log(
                null,
                authentication == null ? null : authentication.getName(),
                "content_idea.deleted",
                "content_idea",
                String.valueOf(contentIdeaId),
                null
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/content-ideas/bulk-delete")
    @Timed(value = "video_ops.bulk_delete", description = "Bulk delete of content ideas", histogram = true)
    public ResponseEntity<Void> deleteContentIdeasBulk(
            @Valid @RequestBody BulkDeleteContentIdeasRequest request,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        List<Long> ids = request.getContentIdeaIds();
        videoOpsService.deleteContentIdeasBulk(ids);

        // Truncate audit payload — large batches would otherwise produce
        // multi-kilobyte log lines and bloat the audit table.
        String idsForAudit = ids.size() <= 10
                ? ids.toString()
                : ids.subList(0, 10) + "... (+" + (ids.size() - 10) + " more)";
        auditService.log(
                null,
                authentication.getName(),
                "content_idea.bulk_deleted",
                "content_idea",
                "count=" + ids.size() + " ids=" + idsForAudit,
                null
        );
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/workflow-runs/{runId}")
    public ResponseEntity<VideoWorkflowRunDetailResponse> getWorkflowRun(
            @PathVariable long runId
    ) {
        return ResponseEntity.ok(videoOpsService.fetchWorkflowRun(runId));
    }

    /**
     * Lightweight status endpoint for frontend polling of in-flight runs.
     * Designed to be hit every 5-10s while the user watches a render or upload
     * progress; returns just the run status + age without the response payload.
     */
    @GetMapping("/workflow-runs/{runId}/status")
    @Timed(value = "video_ops.workflow_run_status", description = "Lightweight workflow run status poll", histogram = true)
    public ResponseEntity<com.tiktokapp.backend.dto.videoops.VideoWorkflowRunStatusResponse> getWorkflowRunStatus(
            @PathVariable long runId
    ) {
        return ResponseEntity.ok(videoOpsService.fetchWorkflowRunStatus(runId));
    }

    @PostMapping("/internal/alerts/notify")
    public ResponseEntity<Map<String, String>> notifyAlert(
            @Valid @RequestBody AlertNotifyRequest request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        SlackAlertService.Severity severity = "WARNING".equalsIgnoreCase(request.getSeverity())
                ? SlackAlertService.Severity.WARNING
                : SlackAlertService.Severity.CRITICAL;
        SlackAlertService.AlertNotification alert = new SlackAlertService.AlertNotification(
                request.getWorkflowType(),
                request.getRunId(),
                request.getContentIdeaId(),
                request.getErrorMessage(),
                request.getNode(),
                request.getAttempt() == null ? 0 : request.getAttempt(),
                request.getMaxAttempts() == null ? 0 : request.getMaxAttempts(),
                severity,
                Boolean.TRUE.equals(request.getFatal()),
                request.getN8nUrl()
        );
        SlackAlertService.AlertResult result = slackAlertService.notify(alert);
        return ResponseEntity.ok(Map.of(
                "status", result.status(),
                "detail", result.detail() == null ? "" : result.detail()
        ));
    }

    @PostMapping("/internal/tiktok/init-publish-context")
    public ResponseEntity<TikTokInitPublishContextResponse> buildInitPublishContext(
            @Valid @RequestBody TikTokInitPublishContextRequest request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(tikTokInitPublishContextService.buildContext(request));
    }

    @PostMapping("/internal/tiktok/account-context")
    public ResponseEntity<TikTokAccountContextResponse> buildAccountContext(
            @Valid @RequestBody TikTokAccountContextRequest request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(tikTokInternalAccountContextService.buildContext(request));
    }

    // ── Proxy endpoints (JsonNode by design) ─────────────────────────────
    // The bodies below forward opaque payloads to/from third-party APIs
    // (Groq, Pexels, RenderVideo). Modeling these as DTOs would require
    // mirroring three external schemas that change independently of us, so
    // we keep them as JsonNode and let the consumer interpret the shape.

    @PostMapping("/internal/groq/chat-completions")
    public ResponseEntity<JsonNode> proxyGroqChatCompletions(
            @RequestBody(required = false) JsonNode request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyGroqChatCompletions(request));
    }

    @PostMapping("/internal/pexels/videos/search")
    public ResponseEntity<JsonNode> proxyPexelsVideoSearch(
            @Valid @RequestBody PexelsVideoSearchRequest request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyPexelsVideoSearch(
                request.getQuery(),
                request.getPerPage(),
                request.getOrientation()
        ));
    }

    @PostMapping("/internal/render-video/render")
    public ResponseEntity<JsonNode> proxyRenderVideo(
            @RequestBody(required = false) JsonNode request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyRenderVideo(request));
    }

    @PostMapping("/internal/render-video/render-async")
    public ResponseEntity<JsonNode> proxyRenderVideoAsync(
            @RequestBody(required = false) JsonNode request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyRenderVideoAsync(request));
    }

    @GetMapping("/render-video/progress/{workflowRunId}")
    public ResponseEntity<JsonNode> getRenderVideoProgress(@PathVariable long workflowRunId) {
        // Endpoint admin-auth (pas internal-secret) — appelé par le frontend pour
        // suivre l'avancement d'un rendu en cours.
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyRenderVideoProgress(workflowRunId));
    }

    @GetMapping("/pexels/videos/search")
    public ResponseEntity<JsonNode> searchPexelsVideos(
            @org.springframework.web.bind.annotation.RequestParam("query") String query,
            @org.springframework.web.bind.annotation.RequestParam(value = "perPage", required = false) Integer perPage,
            @org.springframework.web.bind.annotation.RequestParam(value = "orientation", required = false) String orientation
    ) {
        // Endpoint admin-auth pour la galerie de sélection de médias dans
        // l'étape "Médias" du parcours TikTok. Frontend uniquement.
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyPexelsVideoSearch(query, perPage, orientation));
    }

    @PostMapping("/workflows/main-pipeline")
    public ResponseEntity<VideoWorkflowActionResponse> triggerMainPipeline(
            @Valid @RequestBody(required = false) WorkflowTriggerRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.triggerMainPipeline(request == null ? new WorkflowTriggerRequest() : request, authentication.getName()));
    }

    @PostMapping("/workflows/render-template")
    public ResponseEntity<VideoWorkflowActionResponse> triggerRenderTemplate(
            @Valid @RequestBody WorkflowTriggerRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.triggerRenderTemplate(request, authentication.getName()));
    }

    @PostMapping("/workflows/init-publish")
    public ResponseEntity<VideoWorkflowActionResponse> triggerInitPublish(
            @Valid @RequestBody WorkflowTriggerRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.triggerInitPublish(request, authentication.getName()));
    }

    /**
     * Endpoint admin pour mettre à jour le contenu éditable d une content_idea
     * (topic, script, caption, keyword) depuis le parcours TikTok côté UI.
     * Whitelist stricte des champs portée par {@link ContentIdeaPatchRequest} :
     * on n autorise pas la modif des statuts / timestamps / urls / ids depuis
     * ici (ils restent gérés par les workflows). Le retour reste un JsonNode
     * car {@code videoOpsDataService.patchContentIdea} forward la ligne brute
     * de la table {@code content_ideas} qui contient ~30 colonnes mixtes.
     */
    @PatchMapping("/content-ideas/{contentIdeaId}")
    public ResponseEntity<JsonNode> patchContentIdeaAdmin(
            @PathVariable long contentIdeaId,
            @Valid @RequestBody ContentIdeaPatchRequest request,
            Authentication authentication
    ) {
        Map<String, Object> safe = request.toSafePatch();
        if (safe.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun champ modifiable fourni.");
        }
        logger.info("admin patch content_idea contentIdeaId={} keys={} requestedBy={}",
                contentIdeaId, safe.keySet(), authentication.getName());
        return ResponseEntity.ok(videoOpsDataService.patchContentIdea(contentIdeaId, safe));
    }

    @PostMapping("/content-ideas/{contentIdeaId}/upload")
    public ResponseEntity<TikTokUploadResponse> uploadTikTokMedia(
            @PathVariable long contentIdeaId,
            @Valid @RequestBody VideoUploadRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.uploadTikTokMedia(
                contentIdeaId,
                request.getShotstackUrl(),
                request.getUploadUrl(),
                Boolean.TRUE.equals(request.getForce()),
                authentication.getName()
        ));
    }

    @PostMapping("/content-ideas/batch-publish")
    public ResponseEntity<BatchPublishResponse> startBatchPublish(
            @Valid @RequestBody BatchPublishRequest request,
            Authentication authentication
    ) {
        BatchPublishResponse response = batchPublishService.startBatch(
                request.getContentIdeaIds(),
                request.getTiktokAccountOpenId(),
                authentication.getName()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/batches/{batchId}")
    public ResponseEntity<BatchPublishResponse> getBatch(@PathVariable String batchId) {
        return ResponseEntity.ok(batchPublishService.getBatch(batchId));
    }

    @PostMapping("/content-ideas/{contentIdeaId}/publish")
    public ResponseEntity<VideoWorkflowActionResponse> markPublishComplete(
            @PathVariable long contentIdeaId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.markPublishComplete(contentIdeaId, authentication.getName()));
    }

    // ── Endpoints internes pour les workflows n8n (CRUD PostgreSQL direct) ──

    @PostMapping("/internal/content-ideas")
    public ResponseEntity<JsonNode> createContentIdea(
            @RequestBody ContentIdeaCreateRequest request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.status(HttpStatus.CREATED).body(videoOpsDataService.createContentIdea(request));
    }

    @GetMapping("/internal/content-ideas/{id}")
    public ResponseEntity<JsonNode> getContentIdea(
            @PathVariable long id,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsDataService.getContentIdea(id));
    }

    @PatchMapping("/internal/content-ideas/{id}")
    public ResponseEntity<JsonNode> patchContentIdea(
            @PathVariable long id,
            @RequestBody Map<String, Object> patch,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsDataService.patchContentIdea(id, patch));
    }

    @GetMapping("/internal/tiktok-accounts")
    public ResponseEntity<JsonNode> getTikTokAccountByOpenId(
            @RequestParam String openId,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsDataService.getTikTokAccountByOpenId(openId));
    }

    @PatchMapping("/internal/tiktok-accounts/{id}")
    public ResponseEntity<JsonNode> patchTikTokAccount(
            @PathVariable long id,
            @RequestBody Map<String, Object> patch,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsDataService.patchTikTokAccount(id, patch));
    }

    @PostMapping("/workflow-runs/{runId}/complete")
    public ResponseEntity<VideoWorkflowRunDetailResponse> completeWorkflowRun(
            @PathVariable long runId,
            @RequestBody String rawBody,
            @RequestHeader(name = "X-Video-Ops-Callback-Timestamp", required = false) String callbackTimestamp,
            @RequestHeader(name = "X-Video-Ops-Callback-Signature", required = false) String callbackSignature,
            @RequestHeader(name = "X-Video-Ops-Callback-Secret", required = false) String callbackSecret,
            @RequestHeader(name = WorkflowContract.HEADER_CONTRACT_VERSION, required = false) String contractVersion,
            @RequestHeader(name = WorkflowContract.HEADER_IDEMPOTENCY_KEY, required = false) String idempotencyKey,
            HttpServletRequest servletRequest
    ) {
        videoOpsService.validateWorkflowCallbackRequest(
                servletRequest.getMethod(),
                servletRequest.getRequestURI(),
                rawBody,
                callbackTimestamp,
                callbackSignature,
                callbackSecret
        );
        // Strict contract enforcement: a callback that declares an unsupported
        // contract version is rejected with 412 PRECONDITION_FAILED so n8n
        // surfaces the version mismatch immediately instead of advancing the
        // run with a payload the backend may not understand. Missing header is
        // tolerated for back-compat with legacy / replayed callbacks.
        if (contractVersion != null && !contractVersion.isBlank()
                && !WorkflowContract.CONTRACT_VERSION.equals(contractVersion.trim())) {
            logger.warn("Workflow callback runId={} contractVersion={} rejected (backend expects {})",
                    runId, contractVersion, WorkflowContract.CONTRACT_VERSION);
            throw new ResponseStatusException(
                    HttpStatus.PRECONDITION_FAILED,
                    "Workflow contract version " + contractVersion.trim()
                            + " incompatible avec le backend (" + WorkflowContract.CONTRACT_VERSION + ")."
            );
        }
        logger.info("Workflow callback received runId={} contractVersion={}", runId,
                (contractVersion == null || contractVersion.isBlank()) ? "<missing>" : contractVersion);
        VideoWorkflowRunCompletionRequest request = parseWorkflowCompletionRequest(rawBody);
        try {
            return ResponseEntity.ok(videoOpsService.completeWorkflowRun(runId, request, idempotencyKey));
        } catch (ResponseStatusException ex) {
            // Client-style failures (validation, 4xx) are not transient — surface as-is.
            throw ex;
        } catch (Exception ex) {
            String canonicalPayload;
            try {
                canonicalPayload = objectMapper.writeValueAsString(request);
            } catch (Exception serialisationFailure) {
                canonicalPayload = rawBody;
            }
            failedCallbackQueue.enqueue(runId, null, canonicalPayload, ex.getMessage());
            logger.warn("Workflow callback runId={} enqueued for replay after error={}", runId, ex.getMessage());
            throw ex;
        }
    }

    private VideoWorkflowRunCompletionRequest parseWorkflowCompletionRequest(String rawBody) {
        if (rawBody == null || rawBody.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload callback workflow invalide.");
        }

        VideoWorkflowRunCompletionRequest request = tryParseWorkflowCompletionRequest(rawBody);
        if (request != null) {
            return request;
        }

        try {
            String nestedJson = objectMapper.readValue(rawBody, String.class);
            request = tryParseWorkflowCompletionRequest(nestedJson);
            if (request != null) {
                return request;
            }
        } catch (Exception ignored) {
            // Ignore and continue with other fallbacks.
        }

        request = parseWorkflowCompletionRequestFromForm(rawBody);
        if (request != null) {
            return request;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload callback workflow invalide.");
    }

    private VideoWorkflowRunCompletionRequest tryParseWorkflowCompletionRequest(String rawBody) {
        try {
            VideoWorkflowRunCompletionRequest request = objectMapper.readValue(rawBody, VideoWorkflowRunCompletionRequest.class);
            return hasWorkflowCompletionStatus(request) ? request : null;
        } catch (Exception ignored) {
            // Ignore and continue with JsonNode fallback.
        }

        try {
            return toWorkflowCompletionRequest(objectMapper.readTree(rawBody));
        } catch (Exception ignored) {
            return null;
        }
    }

    private VideoWorkflowRunCompletionRequest toWorkflowCompletionRequest(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isTextual()) {
            return tryParseWorkflowCompletionRequest(node.asText());
        }
        if (!node.isObject()) {
            return null;
        }

        VideoWorkflowRunCompletionRequest request = new VideoWorkflowRunCompletionRequest();
        request.setStatus(textOrNull(node.get("status")));
        request.setMessage(textOrNull(node.get("message")));
        request.setErrorMessage(textOrNull(node.get("errorMessage")));

        JsonNode responsePayloadNode = node.get("responsePayload");
        if (responsePayloadNode != null && !responsePayloadNode.isNull()) {
            if (responsePayloadNode.isTextual()) {
                request.setResponsePayload(textOrNull(responsePayloadNode));
            } else {
                try {
                    request.setResponsePayload(objectMapper.writeValueAsString(responsePayloadNode));
                } catch (Exception ignored) {
                    request.setResponsePayload(textOrNull(responsePayloadNode));
                }
            }
        }

        return hasWorkflowCompletionStatus(request) ? request : null;
    }

    private VideoWorkflowRunCompletionRequest parseWorkflowCompletionRequestFromForm(String rawBody) {
        if (rawBody == null || !rawBody.contains("=")) {
            return null;
        }

        Map<String, String> values = new LinkedHashMap<>();
        for (String pair : rawBody.split("&")) {
            if (pair == null || pair.isBlank()) {
                continue;
            }
            int separatorIndex = pair.indexOf('=');
            String key = separatorIndex >= 0 ? pair.substring(0, separatorIndex) : pair;
            String value = separatorIndex >= 0 ? pair.substring(separatorIndex + 1) : "";
            values.put(
                    URLDecoder.decode(key, StandardCharsets.UTF_8),
                    URLDecoder.decode(value, StandardCharsets.UTF_8)
            );
        }

        if (!values.containsKey("status")) {
            return null;
        }

        VideoWorkflowRunCompletionRequest request = new VideoWorkflowRunCompletionRequest();
        request.setStatus(textOrNull(values.get("status")));
        request.setMessage(textOrNull(values.get("message")));
        request.setErrorMessage(textOrNull(values.get("errorMessage")));
        request.setResponsePayload(textOrNull(values.get("responsePayload")));
        return hasWorkflowCompletionStatus(request) ? request : null;
    }

    private boolean hasWorkflowCompletionStatus(VideoWorkflowRunCompletionRequest request) {
        return request != null && request.getStatus() != null && !request.getStatus().isBlank();
    }

    private String textOrNull(JsonNode node) {
        return node == null ? null : textOrNull(node.asText(null));
    }

    private String textOrNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

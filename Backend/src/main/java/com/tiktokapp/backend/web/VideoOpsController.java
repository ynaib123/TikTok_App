package com.tiktokapp.backend.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.AccountsOverviewResponse;
import com.tiktokapp.backend.dto.videoops.AlertNotifyRequest;
import com.tiktokapp.backend.dto.videoops.BatchPublishRequest;
import com.tiktokapp.backend.dto.videoops.BatchPublishResponse;
import com.tiktokapp.backend.service.alerting.SlackAlertService;
import com.tiktokapp.backend.service.videoops.BatchPublishService;
import com.tiktokapp.backend.dto.videoops.AccountsReadinessResponse;
import com.tiktokapp.backend.dto.videoops.PexelsVideoSearchRequest;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionRequest;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeRequest;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackRequest;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackResponse;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextRequest;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaStatusResponse;
import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoOpsHealthResponse;
import com.tiktokapp.backend.service.videoops.VideoOpsHealthService;
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoUploadRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.ContentIdeaCreateRequest;
import com.tiktokapp.backend.service.videoops.AccountsService;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import com.tiktokapp.backend.service.videoops.VideoOpsDataService;
import com.tiktokapp.backend.service.videoops.TikTokOAuthService;
import com.tiktokapp.backend.service.videoops.TikTokInternalAccountContextService;
import com.tiktokapp.backend.service.videoops.TikTokInitPublishContextService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalProxyService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalAuthService;
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

    private final VideoOpsService videoOpsService;
    private final VideoOpsDataService videoOpsDataService;
    private final AccountsService accountsService;
    private final TikTokOAuthService tikTokOAuthService;
    private final TikTokInternalAccountContextService tikTokInternalAccountContextService;
    private final TikTokInitPublishContextService tikTokInitPublishContextService;
    private final VideoOpsInternalProxyService videoOpsInternalProxyService;
    private final VideoOpsInternalAuthService internalAuthService;
    private final SlackAlertService slackAlertService;
    private final BatchPublishService batchPublishService;
    private final VideoOpsHealthService videoOpsHealthService;
    private final ObjectMapper objectMapper;

    public VideoOpsController(
            VideoOpsService videoOpsService,
            VideoOpsDataService videoOpsDataService,
            AccountsService accountsService,
            TikTokOAuthService tikTokOAuthService,
            TikTokInternalAccountContextService tikTokInternalAccountContextService,
            TikTokInitPublishContextService tikTokInitPublishContextService,
            VideoOpsInternalProxyService videoOpsInternalProxyService,
            VideoOpsInternalAuthService internalAuthService,
            SlackAlertService slackAlertService,
            BatchPublishService batchPublishService,
            VideoOpsHealthService videoOpsHealthService,
            ObjectMapper objectMapper
    ) {
        this.videoOpsService = videoOpsService;
        this.videoOpsDataService = videoOpsDataService;
        this.accountsService = accountsService;
        this.tikTokOAuthService = tikTokOAuthService;
        this.tikTokInternalAccountContextService = tikTokInternalAccountContextService;
        this.tikTokInitPublishContextService = tikTokInitPublishContextService;
        this.videoOpsInternalProxyService = videoOpsInternalProxyService;
        this.internalAuthService = internalAuthService;
        this.slackAlertService = slackAlertService;
        this.batchPublishService = batchPublishService;
        this.videoOpsHealthService = videoOpsHealthService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/health")
    public ResponseEntity<VideoOpsHealthResponse> getVideoOpsHealth() {
        VideoOpsHealthResponse health = videoOpsHealthService.buildHealth();
        HttpStatus status = "DOWN".equals(health.status()) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
        return ResponseEntity.status(status).body(health);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<VideoDashboardResponse> getDashboard() {
        return ResponseEntity.ok(videoOpsService.fetchDashboard());
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

    @GetMapping("/manual-actions")
    public ResponseEntity<List<VideoManualActionResponse>> getManualActions() {
        return ResponseEntity.ok(videoOpsService.fetchManualActions());
    }

    @GetMapping("/observability")
    public ResponseEntity<VideoObservabilityResponse> getObservability() {
        return ResponseEntity.ok(videoOpsService.fetchObservability());
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
    public ResponseEntity<Void> deleteContentIdea(@PathVariable long contentIdeaId) {
        videoOpsService.deleteContentIdea(contentIdeaId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/workflow-runs/{runId}")
    public ResponseEntity<VideoWorkflowRunDetailResponse> getWorkflowRun(
            @PathVariable long runId
    ) {
        return ResponseEntity.ok(videoOpsService.fetchWorkflowRun(runId));
    }

    @PostMapping("/tiktok-oauth/authorize")
    public ResponseEntity<TikTokOAuthAuthorizeResponse> createTikTokAuthorizationUrl(
            @RequestBody(required = false) TikTokOAuthAuthorizeRequest request,
            Authentication authentication
    ) {
        String redirectPath = request == null ? null : request.getRedirectPath();
        return ResponseEntity.ok(tikTokOAuthService.createAuthorizationUrl(authentication.getName(), redirectPath));
    }

    @PostMapping("/tiktok-oauth/callback")
    public ResponseEntity<TikTokOAuthCallbackResponse> completeTikTokAuthorization(
            @Valid @RequestBody TikTokOAuthCallbackRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(tikTokOAuthService.completeAuthorization(
                authentication.getName(),
                request.getCode(),
                request.getState()
        ));
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

    @PostMapping("/internal/shotstack/render")
    public ResponseEntity<JsonNode> proxyShotstackRender(
            @RequestBody(required = false) JsonNode request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyShotstackRender(request));
    }

    @GetMapping("/internal/shotstack/render/{renderId}")
    public ResponseEntity<JsonNode> proxyShotstackRenderStatus(
            @PathVariable String renderId,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);
        return ResponseEntity.ok(videoOpsInternalProxyService.proxyShotstackRenderStatus(renderId));
    }

    @PostMapping("/workflows/main-pipeline")
    public ResponseEntity<VideoWorkflowActionResponse> triggerMainPipeline(
            @Valid @RequestBody(required = false) WorkflowTriggerRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.triggerMainPipeline(request == null ? new WorkflowTriggerRequest() : request, authentication.getName()));
    }

    @PostMapping("/workflows/check-shotstack")
    public ResponseEntity<VideoWorkflowActionResponse> triggerCheckShotstack(
            @Valid @RequestBody WorkflowTriggerRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.triggerCheckShotstack(request, authentication.getName()));
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
        VideoWorkflowRunCompletionRequest request = parseWorkflowCompletionRequest(rawBody);
        return ResponseEntity.ok(videoOpsService.completeWorkflowRun(runId, request));
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

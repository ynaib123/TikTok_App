package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.AccountsOverviewResponse;
import com.tiktokapp.backend.dto.videoops.AccountsReadinessResponse;
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
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoUploadRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.service.videoops.AccountsService;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import com.tiktokapp.backend.service.videoops.TikTokOAuthService;
import com.tiktokapp.backend.service.videoops.TikTokInternalAccountContextService;
import com.tiktokapp.backend.service.videoops.TikTokInitPublishContextService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalAuthService;
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

import java.util.List;

@RestController
@RequestMapping("/api/video-ops")
public class VideoOpsController {

    private final VideoOpsService videoOpsService;
    private final AccountsService accountsService;
    private final TikTokOAuthService tikTokOAuthService;
    private final TikTokInternalAccountContextService tikTokInternalAccountContextService;
    private final TikTokInitPublishContextService tikTokInitPublishContextService;
    private final VideoOpsInternalAuthService internalAuthService;
    private final ObjectMapper objectMapper;

    public VideoOpsController(
            VideoOpsService videoOpsService,
            AccountsService accountsService,
            TikTokOAuthService tikTokOAuthService,
            TikTokInternalAccountContextService tikTokInternalAccountContextService,
            TikTokInitPublishContextService tikTokInitPublishContextService,
            VideoOpsInternalAuthService internalAuthService,
            ObjectMapper objectMapper
    ) {
        this.videoOpsService = videoOpsService;
        this.accountsService = accountsService;
        this.tikTokOAuthService = tikTokOAuthService;
        this.tikTokInternalAccountContextService = tikTokInternalAccountContextService;
        this.tikTokInitPublishContextService = tikTokInitPublishContextService;
        this.internalAuthService = internalAuthService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<VideoDashboardResponse> getDashboard() {
        return ResponseEntity.ok(videoOpsService.fetchDashboard());
    }

    @GetMapping("/content-ideas")
    public ResponseEntity<List<VideoContentIdeaResponse>> getContentIdeas() {
        return ResponseEntity.ok(videoOpsService.fetchContentIdeas());
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

    @DeleteMapping("/accounts/services/{providerKey}")
    public ResponseEntity<Void> disconnectServiceConnection(@PathVariable String providerKey) {
        accountsService.disconnectServiceConnection(providerKey);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/tiktok-accounts/{accountId}")
    public ResponseEntity<Void> disconnectTikTokAccount(@PathVariable long accountId) {
        accountsService.disconnectTikTokAccount(accountId);
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

    @PostMapping("/content-ideas/{contentIdeaId}/publish")
    public ResponseEntity<VideoWorkflowActionResponse> markPublishComplete(
            @PathVariable long contentIdeaId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(videoOpsService.markPublishComplete(contentIdeaId, authentication.getName()));
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
        try {
            VideoWorkflowRunCompletionRequest request = objectMapper.readValue(rawBody, VideoWorkflowRunCompletionRequest.class);
            return ResponseEntity.ok(videoOpsService.completeWorkflowRun(runId, request));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload callback workflow invalide.", exception);
        }
    }
}

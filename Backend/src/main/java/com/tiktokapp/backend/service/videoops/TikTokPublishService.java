package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.tiktokapp.backend.service.TikTokUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.json;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.logWorkflowInfo;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.logWorkflowWarn;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.lower;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.payloadOf;

/**
 * Owns everything that happens after a video is rendered : init publish on TikTok,
 * upload of the rendered media to the prepared TikTok upload URL, and the manual
 * "publish complete" mark.
 */
@Service
public class TikTokPublishService {

    private static final Logger logger = LoggerFactory.getLogger(TikTokPublishService.class);

    private final WorkflowOrchestrator workflowOrchestrator;
    private final ContentIdeaGateway contentIdeaGateway;
    private final TikTokUploadService tikTokUploadService;
    private final VideoOpsTrackingService trackingService;
    private final VideoOpsProperties properties;
    private final ObjectMapper objectMapper;

    public TikTokPublishService(
            WorkflowOrchestrator workflowOrchestrator,
            ContentIdeaGateway contentIdeaGateway,
            TikTokUploadService tikTokUploadService,
            VideoOpsTrackingService trackingService,
            VideoOpsProperties properties,
            ObjectMapper objectMapper
    ) {
        this.workflowOrchestrator = workflowOrchestrator;
        this.contentIdeaGateway = contentIdeaGateway;
        this.tikTokUploadService = tikTokUploadService;
        this.trackingService = trackingService;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public VideoWorkflowActionResponse triggerInitPublish(WorkflowTriggerRequest request, String requestedByEmail) {
        Long contentIdeaId = requireContentIdeaId(request.getContentIdeaId(),
                "contentIdeaId est obligatoire pour l'init publish.");
        return workflowOrchestrator.triggerWorkflow(
                VideoWorkflowType.INIT_PUBLISH_TIKTOK,
                contentIdeaId,
                request,
                requestedByEmail,
                VideoOpsStateMachine.requestedStage(VideoWorkflowType.INIT_PUBLISH_TIKTOK)
        );
    }

    @Transactional
    public TikTokUploadResponse uploadTikTokMedia(
            long contentIdeaId,
            String shotstackUrl,
            String uploadUrl,
            boolean force,
            String requestedByEmail
    ) {
        validateAllowedHost(shotstackUrl, properties.getAllowedShotstackHosts(), "shotstackUrl");
        validateAllowedHost(uploadUrl, properties.getAllowedUploadHosts(), "uploadUrl");

        Optional<VideoWorkflowRun> existingRun = workflowOrchestrator
                .findReusableRun(contentIdeaId, VideoWorkflowType.TIKTOK_UPLOAD, force);
        if (existingRun.isPresent()) {
            return new TikTokUploadResponse(
                    true,
                    200,
                    0,
                    "Upload deja execute recemment sous le run " + existingRun.get().getId() + "."
            );
        }

        VideoWorkflowRun run = workflowOrchestrator.createRun(
                contentIdeaId,
                VideoWorkflowType.TIKTOK_UPLOAD,
                requestedByEmail,
                force,
                Map.of("contentIdeaId", contentIdeaId, "shotstackUrl", shotstackUrl, "uploadUrl", uploadUrl),
                workflowOrchestrator.nextAttemptNumber(contentIdeaId, VideoWorkflowType.TIKTOK_UPLOAD)
        );
        trackingService.syncPipelineState(contentIdeaId,
                VideoOpsStateMachine.requestedStage(VideoWorkflowType.TIKTOK_UPLOAD), null, run);
        trackingService.recordEvent(contentIdeaId, run, "INFO", "upload_started",
                "Upload TikTok lance depuis le backend.", Map.of("runId", run.getId()));
        logWorkflowInfo(logger, "upload_started", run, "Upload TikTok lance depuis le backend.");

        try {
            TikTokUploadResponse response = tikTokUploadService.uploadFromShotstack(shotstackUrl, uploadUrl);
            contentIdeaGateway.updateContentIdea(contentIdeaId, Map.of(
                    "tiktok_upload_status", "uploaded",
                    "publish_status", "uploaded",
                    "uploaded_at", Instant.now().toString()
            ));
            workflowOrchestrator.markRunSucceeded(run, responseBody(response));
            trackingService.syncPipelineState(contentIdeaId,
                    VideoOpsStateMachine.successStage(VideoWorkflowType.TIKTOK_UPLOAD,
                            trackingService.currentStage(contentIdeaId)),
                    null, run);
            trackingService.recordEvent(contentIdeaId, run, "INFO", "upload_succeeded",
                    "Upload TikTok termine.", Map.of("statusCode", response.getStatusCode()));
            logWorkflowInfo(logger, "upload_succeeded", run, "Upload TikTok termine.");
            return response;
        } catch (RuntimeException exception) {
            workflowOrchestrator.markRunFailed(run, exception.getMessage());
            trackingService.syncPipelineState(contentIdeaId, VideoOpsStateMachine.failureStage(),
                    exception.getMessage(), run);
            trackingService.recordEvent(contentIdeaId, run, "ERROR", "upload_failed",
                    "Upload TikTok en echec.", payloadOf("error", exception.getMessage()));
            logWorkflowWarn(logger, "upload_failed", run, exception.getMessage());
            throw exception;
        }
    }

    @Transactional
    public VideoWorkflowActionResponse markPublishComplete(long contentIdeaId, String requestedByEmail) {
        VideoWorkflowRun run = workflowOrchestrator.createRun(
                contentIdeaId,
                VideoWorkflowType.FINALIZE_PUBLISH,
                requestedByEmail,
                false,
                Map.of("contentIdeaId", contentIdeaId),
                workflowOrchestrator.nextAttemptNumber(contentIdeaId, VideoWorkflowType.FINALIZE_PUBLISH)
        );

        try {
            contentIdeaGateway.updateContentIdea(contentIdeaId, Map.of(
                    "publish_status", "published",
                    "tiktok_check_status", "PUBLISH_COMPLETE",
                    "published_at", Instant.now().toString()
            ));
            workflowOrchestrator.markRunSucceeded(run, "{\"result\":\"published\"}");
            trackingService.syncPipelineState(contentIdeaId,
                    VideoOpsStateMachine.successStage(VideoWorkflowType.FINALIZE_PUBLISH,
                            trackingService.currentStage(contentIdeaId)),
                    null, run);
            trackingService.recordEvent(contentIdeaId, run, "INFO", "publish_completed",
                    "Publication finale marquee comme complete.", Map.of("contentIdeaId", contentIdeaId));
            logWorkflowInfo(logger, "publish_completed", run, "Publication finale marquee comme complete.");
            return new VideoWorkflowActionResponse(
                    run.getId(),
                    contentIdeaId,
                    run.getWorkflowType().name(),
                    run.getStatus().name(),
                    "Publication finale enregistree.",
                    false
            );
        } catch (RuntimeException exception) {
            workflowOrchestrator.markRunFailed(run, exception.getMessage());
            trackingService.syncPipelineState(contentIdeaId, VideoOpsStateMachine.failureStage(),
                    exception.getMessage(), run);
            trackingService.recordEvent(contentIdeaId, run, "ERROR", "publish_failed",
                    "La finalisation de publication a echoue.", payloadOf("error", exception.getMessage()));
            logWorkflowWarn(logger, "publish_failed", run, exception.getMessage());
            throw exception;
        }
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
                    .map(VideoOpsCommonHelpers::lower)
                    .anyMatch(allowedHost -> host != null
                            && (host.equals(allowedHost) || host.endsWith("." + allowedHost)));
            if (!allowed) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " utilise un host non autorise.");
            }
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    fieldName + " n'est pas une URL valide.", exception);
        }
    }

    private Long requireContentIdeaId(Long contentIdeaId, String message) {
        if (contentIdeaId == null || contentIdeaId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return contentIdeaId;
    }

    private String responseBody(TikTokUploadResponse response) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("success", response.isSuccess());
        payload.put("statusCode", response.getStatusCode());
        payload.put("uploadedBytes", response.getUploadedBytes());
        payload.put("responseBody", response.getResponseBody());
        return json(objectMapper, payload);
    }
}

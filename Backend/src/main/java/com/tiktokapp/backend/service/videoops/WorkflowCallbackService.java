package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Owns workflow callback handling: HMAC validation + the run completion path.
 * Extracted from VideoOpsService so callback-specific behaviour (idempotency
 * on terminal state, status mapping, pipeline sync) lives in one place.
 */
@Service
public class WorkflowCallbackService {

    private static final Logger logger = LoggerFactory.getLogger(WorkflowCallbackService.class);

    private final VideoWorkflowRunRepository workflowRunRepository;
    private final VideoOpsTrackingService trackingService;
    private final VideoOpsCallbackAuthService callbackAuthService;

    public WorkflowCallbackService(
            VideoWorkflowRunRepository workflowRunRepository,
            VideoOpsTrackingService trackingService,
            VideoOpsCallbackAuthService callbackAuthService
    ) {
        this.workflowRunRepository = workflowRunRepository;
        this.trackingService = trackingService;
        this.callbackAuthService = callbackAuthService;
    }

    public void validateCallback(String method, String path, String body, String timestamp, String signature, String legacySecret) {
        callbackAuthService.validateCallback(method, path, body, timestamp, signature, legacySecret);
    }

    @Transactional
    public VideoWorkflowRunDetailResponse completeRun(long runId, VideoWorkflowRunCompletionRequest request) {
        VideoWorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "workflowRun introuvable."));

        VideoWorkflowRunStatus nextStatus = WorkflowCompletionStatusMapper.toRunStatus(request.getStatus());

        VideoWorkflowRunStatus currentStatus = run.getStatus();
        if (currentStatus == VideoWorkflowRunStatus.SUCCEEDED || currentStatus == VideoWorkflowRunStatus.FAILED) {
            trackingService.recordEvent(
                    run.getContentIdeaId(),
                    run,
                    "INFO",
                    "workflow_callback_ignored",
                    "Callback ignore : run deja en etat terminal " + currentStatus + ".",
                    payload("incomingStatus", nextStatus.name())
            );
            logInfo("workflow_callback_ignored", run, "Run deja " + currentStatus + ", callback " + nextStatus + " ignore.");
            return toResponse(run);
        }

        run.setStatus(nextStatus);
        run.setCompletedAt(Instant.now());
        if (request.getResponsePayload() != null && !request.getResponsePayload().isBlank()) {
            run.setResponsePayload(trim(request.getResponsePayload()));
        }
        if (nextStatus == VideoWorkflowRunStatus.FAILED) {
            String errorMessage = trim(request.getErrorMessage());
            run.setErrorMessage(errorMessage == null ? "Workflow externe en echec." : errorMessage);
            trackingService.syncPipelineState(run.getContentIdeaId(), VideoOpsStateMachine.failureStage(), run.getErrorMessage(), run);
            trackingService.recordEvent(
                    run.getContentIdeaId(),
                    run,
                    "ERROR",
                    "workflow_callback_failed",
                    request.getMessage() == null || request.getMessage().isBlank() ? "Workflow externe signale en echec." : request.getMessage(),
                    payload("error", run.getErrorMessage())
            );
            logWarn("workflow_callback_failed", run, run.getErrorMessage());
        } else {
            run.setErrorMessage(null);
            trackingService.syncPipelineState(
                    run.getContentIdeaId(),
                    VideoOpsStateMachine.successStage(run.getWorkflowType(), trackingService.currentStage(run.getContentIdeaId())),
                    null,
                    run
            );
            trackingService.recordEvent(
                    run.getContentIdeaId(),
                    run,
                    "INFO",
                    "workflow_callback_succeeded",
                    request.getMessage() == null || request.getMessage().isBlank() ? "Workflow externe termine avec succes." : request.getMessage(),
                    Map.of("runId", run.getId())
            );
            logInfo("workflow_callback_succeeded", run, request.getMessage() == null ? "Workflow externe termine avec succes." : request.getMessage());
        }
        VideoWorkflowRun saved = workflowRunRepository.save(run);
        return toResponse(saved);
    }

    private VideoWorkflowRunDetailResponse toResponse(VideoWorkflowRun run) {
        return new VideoWorkflowRunDetailResponse(
                run.getId(),
                run.getContentIdeaId(),
                run.getWorkflowType() == null ? null : run.getWorkflowType().name(),
                run.getStatus() == null ? null : run.getStatus().name(),
                run.getAttemptNumber(),
                run.getErrorMessage(),
                run.getResponsePayload(),
                run.getCreatedAt() == null ? null : run.getCreatedAt().toString(),
                run.getCompletedAt() == null ? null : run.getCompletedAt().toString()
        );
    }

    private static Map<String, Object> payload(String key, Object value) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put(key, value);
        return map;
    }

    private static String trim(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        if (normalized.isEmpty()) return null;
        return normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }

    private static void logInfo(String eventType, VideoWorkflowRun run, String message) {
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

    private static void logWarn(String eventType, VideoWorkflowRun run, String message) {
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

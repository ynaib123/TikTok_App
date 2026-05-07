package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.model.FailedCallback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Phase 2.5 follow-up — actually replays a failed callback by re-invoking
 * VideoOpsService.completeWorkflowRun with the persisted payload.
 * Returns true on success so the caller can mark the row resolved.
 */
@Service
public class CallbackReplayService {

    private static final Logger logger = LoggerFactory.getLogger(CallbackReplayService.class);

    private final VideoOpsService videoOpsService;
    private final ObjectMapper objectMapper;

    public CallbackReplayService(VideoOpsService videoOpsService, ObjectMapper objectMapper) {
        this.videoOpsService = videoOpsService;
        this.objectMapper = objectMapper;
    }

    public ReplayOutcome replay(FailedCallback failed) {
        Long runId = failed.getRunId();
        if (runId == null) {
            return ReplayOutcome.permanentFailure("missing runId");
        }
        String payload = failed.getPayloadJson();
        if (payload == null || payload.isBlank()) {
            return ReplayOutcome.permanentFailure("missing payload");
        }

        VideoWorkflowRunCompletionRequest request;
        try {
            request = objectMapper.readValue(payload, VideoWorkflowRunCompletionRequest.class);
        } catch (Exception parseException) {
            logger.warn("dead_letter replay parse_failed id={} runId={} reason={}",
                    failed.getId(), runId, parseException.getMessage());
            return ReplayOutcome.permanentFailure("parse: " + parseException.getMessage());
        }

        try {
            videoOpsService.completeWorkflowRun(runId, request);
            return ReplayOutcome.success();
        } catch (Exception replayException) {
            logger.warn("dead_letter replay failed id={} runId={} reason={}",
                    failed.getId(), runId, replayException.getMessage());
            return ReplayOutcome.transientFailure(replayException.getMessage());
        }
    }

    public record ReplayOutcome(boolean succeeded, boolean retryable, String message) {
        public static ReplayOutcome success() {
            return new ReplayOutcome(true, false, null);
        }
        public static ReplayOutcome transientFailure(String message) {
            return new ReplayOutcome(false, true, message);
        }
        public static ReplayOutcome permanentFailure(String message) {
            return new ReplayOutcome(false, false, message);
        }
    }
}

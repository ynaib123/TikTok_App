package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsMetrics;
import com.tiktokapp.backend.model.FailedCallback;
import com.tiktokapp.backend.repository.FailedCallbackRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Phase 2.5 — dead-letter queue. When a callback can't be processed
 * (DB failure, validation error, etc.), insert it here and let the
 * retry worker pick it up later instead of dropping it on the floor.
 */
@Service
public class FailedCallbackQueue {

    private static final Logger logger = LoggerFactory.getLogger(FailedCallbackQueue.class);

    private final FailedCallbackRepository repository;
    private final VideoOpsMetrics metrics;

    public FailedCallbackQueue(FailedCallbackRepository repository, VideoOpsMetrics metrics) {
        this.repository = repository;
        this.metrics = metrics;
    }

    @Transactional
    public void enqueue(Long runId, String workflowType, String payloadJson, String errorMessage) {
        FailedCallback failed = new FailedCallback();
        failed.setRunId(runId);
        failed.setWorkflowType(workflowType);
        failed.setPayloadJson(payloadJson);
        failed.setErrorMessage(truncate(errorMessage, 2048));
        failed.setAttemptCount(1);
        failed.setNextRetryAt(Instant.now().plus(backoffFor(1)));
        repository.save(failed);
        metrics.incrementCallbackFailure(workflowType);
        logger.warn("dead_letter enqueued runId={} workflowType={}", runId, workflowType);
    }

    @Transactional
    public void markResolved(FailedCallback failed, String resolution) {
        failed.setResolvedAt(Instant.now());
        failed.setResolution(resolution);
        repository.save(failed);
    }

    @Transactional
    public void scheduleNextRetry(FailedCallback failed, String errorMessage) {
        int newAttempt = failed.getAttemptCount() + 1;
        failed.setAttemptCount(newAttempt);
        failed.setLastAttemptAt(Instant.now());
        failed.setErrorMessage(truncate(errorMessage, 2048));
        failed.setNextRetryAt(Instant.now().plus(backoffFor(newAttempt)));
        repository.save(failed);
    }

    public Duration backoffFor(int attempt) {
        // Exponential 1m, 5m, 25m, 2h, 10h, then cap at 24h.
        long minutes = (long) Math.min(1440, Math.pow(5, Math.max(0, attempt - 1)));
        return Duration.ofMinutes(Math.max(1, minutes));
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}

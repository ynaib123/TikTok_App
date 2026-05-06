package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsMetrics;
import com.tiktokapp.backend.model.FailedCallback;
import com.tiktokapp.backend.repository.FailedCallbackRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Phase 2.5 — scheduled worker that retries failed callbacks
 * with exponential backoff. After 5 unsuccessful attempts the
 * record is marked manual-resolution and an alert is fired.
 */
@Component
public class FailedCallbackRetryWorker {

    private static final Logger logger = LoggerFactory.getLogger(FailedCallbackRetryWorker.class);
    private static final int MAX_ATTEMPTS = 5;

    private final FailedCallbackRepository repository;
    private final FailedCallbackQueue queue;
    private final VideoOpsMetrics metrics;
    private final CallbackReplayService replayService;

    public FailedCallbackRetryWorker(
            FailedCallbackRepository repository,
            FailedCallbackQueue queue,
            VideoOpsMetrics metrics,
            CallbackReplayService replayService
    ) {
        this.repository = repository;
        this.queue = queue;
        this.metrics = metrics;
        this.replayService = replayService;
    }

    @Scheduled(fixedDelayString = "${app.video-ops.failed-callback-retry-interval-ms:120000}")
    @Transactional
    public void retryDue() {
        List<FailedCallback> due = repository.findByResolvedAtIsNullAndNextRetryAtBefore(Instant.now());
        if (due.isEmpty()) return;

        logger.info("dead_letter retry_run pending={}", due.size());
        for (FailedCallback failed : due) {
            try {
                if (failed.getAttemptCount() >= MAX_ATTEMPTS) {
                    queue.markResolved(failed, "manual_required");
                    logger.error("dead_letter exhausted runId={} workflowType={} attempts={} - manual intervention required",
                            failed.getRunId(), failed.getWorkflowType(), failed.getAttemptCount());
                    metrics.incrementCallbackFailure(failed.getWorkflowType());
                    continue;
                }

                CallbackReplayService.ReplayOutcome outcome = replayService.replay(failed);
                if (outcome.succeeded()) {
                    queue.markResolved(failed, "replayed");
                    logger.info("dead_letter replay_success runId={} attempt={}",
                            failed.getRunId(), failed.getAttemptCount());
                } else if (!outcome.retryable()) {
                    queue.markResolved(failed, "unrecoverable");
                    metrics.incrementCallbackFailure(failed.getWorkflowType());
                    logger.error("dead_letter replay_unrecoverable runId={} reason={}",
                            failed.getRunId(), outcome.message());
                } else {
                    queue.scheduleNextRetry(failed, outcome.message());
                    logger.info("dead_letter retry_scheduled runId={} attempt={}",
                            failed.getRunId(), failed.getAttemptCount());
                }
            } catch (Exception exception) {
                logger.warn("dead_letter retry_loop error id={}", failed.getId(), exception);
            }
        }
    }
}

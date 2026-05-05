package com.tiktokapp.backend.service.alerting;

import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
public class StuckWorkflowRunDetector {

    private static final Logger logger = LoggerFactory.getLogger(StuckWorkflowRunDetector.class);

    private final VideoWorkflowRunRepository workflowRunRepository;
    private final SlackAlertService slackAlertService;
    private final AlertingProperties properties;

    public StuckWorkflowRunDetector(
            VideoWorkflowRunRepository workflowRunRepository,
            SlackAlertService slackAlertService,
            AlertingProperties properties
    ) {
        this.workflowRunRepository = workflowRunRepository;
        this.slackAlertService = slackAlertService;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${app.alerting.stuck-run-check-interval-ms:120000}", initialDelay = 60_000)
    @Transactional
    public void detectStuckRuns() {
        if (!properties.isEnabled()) {
            return;
        }
        Instant threshold = Instant.now().minus(Duration.ofSeconds(properties.getStuckRunThresholdSeconds()));
        List<VideoWorkflowRun> stuck = workflowRunRepository.findByStatusInAndCreatedAtBefore(
                List.of(VideoWorkflowRunStatus.PENDING, VideoWorkflowRunStatus.ACCEPTED),
                threshold
        );
        if (stuck.isEmpty()) {
            return;
        }
        logger.warn("Detected {} stuck workflow runs older than {}s", stuck.size(), properties.getStuckRunThresholdSeconds());

        for (VideoWorkflowRun run : stuck) {
            String errorMsg = "Timeout - aucun callback recu en "
                    + (properties.getStuckRunThresholdSeconds() / 60) + " min.";
            SlackAlertService.AlertNotification alert = new SlackAlertService.AlertNotification(
                    run.getWorkflowType() == null ? "unknown" : run.getWorkflowType().name(),
                    String.valueOf(run.getId()),
                    run.getContentIdeaId() == null ? null : String.valueOf(run.getContentIdeaId()),
                    errorMsg,
                    "Backend StuckRunDetector",
                    run.getAttemptNumber(),
                    run.getAttemptNumber(),
                    SlackAlertService.Severity.WARNING,
                    false,
                    null
            );
            try {
                slackAlertService.notify(alert);
            } catch (Exception e) {
                logger.error("Failed to send stuck-run alert for run {}", run.getId(), e);
            }
            run.setStatus(VideoWorkflowRunStatus.FAILED);
            run.setErrorMessage(errorMsg);
            run.setCompletedAt(Instant.now());
            workflowRunRepository.save(run);
        }
    }
}

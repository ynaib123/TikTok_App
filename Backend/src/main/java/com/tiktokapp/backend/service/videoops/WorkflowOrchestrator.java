package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.isBlank;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.json;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.logWorkflowInfo;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.logWorkflowWarn;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.lower;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.payloadOf;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.text;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.trimToNull;

/**
 * Common trigger orchestration shared by content generation, render and publish services.
 * Owns the lifecycle of a {@link VideoWorkflowRun} : idempotency, run creation, persistence,
 * state transitions, n8n dispatch and tracking event emission.
 */
@Service
public class WorkflowOrchestrator {

    private static final Logger logger = LoggerFactory.getLogger(WorkflowOrchestrator.class);

    private final ContentIdeaGateway contentIdeaGateway;
    private final N8nWorkflowGateway n8nWorkflowGateway;
    private final VideoWorkflowRunRepository workflowRunRepository;
    private final VideoOpsProperties properties;
    private final ObjectMapper objectMapper;
    private final VideoOpsRunPersistenceHelper runPersistenceHelper;
    private final VideoOpsTrackingService trackingService;

    public WorkflowOrchestrator(
            ContentIdeaGateway contentIdeaGateway,
            N8nWorkflowGateway n8nWorkflowGateway,
            VideoWorkflowRunRepository workflowRunRepository,
            VideoOpsProperties properties,
            ObjectMapper objectMapper,
            VideoOpsRunPersistenceHelper runPersistenceHelper,
            VideoOpsTrackingService trackingService
    ) {
        this.contentIdeaGateway = contentIdeaGateway;
        this.n8nWorkflowGateway = n8nWorkflowGateway;
        this.workflowRunRepository = workflowRunRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.runPersistenceHelper = runPersistenceHelper;
        this.trackingService = trackingService;
    }

    @Transactional
    public VideoWorkflowActionResponse triggerWorkflow(
            VideoWorkflowType workflowType,
            Long contentIdeaId,
            WorkflowTriggerRequest request,
            String requestedByEmail,
            VideoPipelineStage nextStage
    ) {
        boolean force = Boolean.TRUE.equals(request.getForce());
        VideoWorkflowRun existingRun = findReusableRun(contentIdeaId, workflowType, force).orElse(null);
        if (existingRun != null) {
            trackingService.recordEvent(contentIdeaId, existingRun, "INFO", "workflow_reused",
                    "Requete idempotente reusee.", Map.of("runId", existingRun.getId()));
            logWorkflowInfo(logger, "workflow_reused", existingRun, "Requete idempotente reusee.");
            return new VideoWorkflowActionResponse(
                    existingRun.getId(),
                    contentIdeaId,
                    workflowType.name(),
                    existingRun.getStatus().name(),
                    "Requete deja acceptee recemment.",
                    true
            );
        }

        Map<String, Object> payload = buildPayload(workflowType, contentIdeaId, request, requestedByEmail);
        VideoWorkflowRun run = createRun(
                contentIdeaId,
                workflowType,
                requestedByEmail,
                force,
                payload,
                nextAttemptNumber(contentIdeaId, workflowType)
        );
        trackingService.syncPipelineState(contentIdeaId, nextStage, null, run);
        trackingService.recordEvent(contentIdeaId, run, "INFO", "workflow_requested",
                "Workflow " + workflowType + " demande.", payload);
        logWorkflowInfo(logger, "workflow_requested", run, "Workflow " + workflowType + " demande.");

        try {
            JsonNode response = n8nWorkflowGateway.trigger(workflowType, payloadWithRunMetadata(payload, run));
            validateWorkflowAcceptance(workflowType, response);

            if (workflowType == VideoWorkflowType.INIT_PUBLISH_TIKTOK
                    && hasCompletedInitPublishState(contentIdeaId, response)) {
                return finalizeInlineSuccess(workflowType, contentIdeaId, response, run);
            }

            markRunAccepted(run, json(objectMapper, response));
            trackingService.recordEvent(contentIdeaId, run, "INFO", "workflow_accepted",
                    "Workflow " + workflowType + " accepte par n8n.", Map.of("runId", run.getId()));
            logWorkflowInfo(logger, "workflow_accepted", run, "Workflow " + workflowType + " accepte par n8n.");
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
            trackingService.syncPipelineState(contentIdeaId, VideoOpsStateMachine.failureStage(),
                    exception.getMessage(), run);
            trackingService.recordEvent(contentIdeaId, run, "ERROR", "workflow_failed",
                    "Workflow " + workflowType + " en echec.", payloadOf("error", exception.getMessage()));
            logWorkflowWarn(logger, "workflow_failed", run, exception.getMessage());
            throw exception;
        }
    }

    private VideoWorkflowActionResponse finalizeInlineSuccess(
            VideoWorkflowType workflowType,
            Long contentIdeaId,
            JsonNode response,
            VideoWorkflowRun run
    ) {
        VideoWorkflowRun freshRun = workflowRunRepository.findById(run.getId()).orElse(run);
        if (freshRun.getStatus() == VideoWorkflowRunStatus.SUCCEEDED) {
            logWorkflowInfo(logger, "workflow_succeeded_inline_callback_won", freshRun,
                    "Callback already marked run SUCCEEDED.");
            return new VideoWorkflowActionResponse(
                    freshRun.getId(),
                    contentIdeaId,
                    workflowType.name(),
                    freshRun.getStatus().name(),
                    "Workflow termine inline par n8n.",
                    false
            );
        }
        try {
            markRunSucceeded(run, json(objectMapper, response));
            trackingService.syncPipelineState(contentIdeaId,
                    VideoOpsStateMachine.successStage(workflowType, trackingService.currentStage(contentIdeaId)),
                    null, run);
            trackingService.recordEvent(contentIdeaId, run, "INFO", "workflow_succeeded_inline",
                    "Workflow " + workflowType + " termine inline par n8n.", Map.of("runId", run.getId()));
            logWorkflowInfo(logger, "workflow_succeeded_inline", run,
                    "Workflow " + workflowType + " termine inline par n8n.");
        } catch (ObjectOptimisticLockingFailureException raceEx) {
            logWorkflowInfo(logger, "workflow_succeeded_inline_race", run,
                    "Callback raced ahead during inline completion; treating as success.");
        }
        return new VideoWorkflowActionResponse(
                run.getId(),
                contentIdeaId,
                workflowType.name(),
                VideoWorkflowRunStatus.SUCCEEDED.name(),
                "Workflow termine inline par n8n.",
                false
        );
    }

    private Map<String, Object> buildPayload(
            VideoWorkflowType workflowType,
            Long contentIdeaId,
            WorkflowTriggerRequest request,
            String requestedByEmail
    ) {
        String category = trimToNull(request.getCategory());
        String topic = trimToNull(request.getTopic());
        String script = trimToNull(request.getScript());
        String caption = trimToNull(request.getCaption());
        String keyword = trimToNull(request.getKeyword());
        String tiktokAccountOpenId = trimToNull(request.getTiktokAccountOpenId());
        String templateId = trimToNull(request.getTemplateId());
        String qualityProfile = trimToNull(request.getQualityProfile());

        if (workflowType == VideoWorkflowType.RENDER_TEMPLATE_VIDEO && contentIdeaId != null
                && (isBlank(topic) || isBlank(script) || isBlank(caption) || isBlank(keyword)
                        || isBlank(templateId) || isBlank(qualityProfile))) {
            JsonNode rows = contentIdeaGateway.fetchContentIdeaById(contentIdeaId);
            if (!rows.isArray() || rows.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable.");
            }
            JsonNode idea = rows.get(0);
            if (isBlank(topic)) topic = trimToNull(text(idea, "topic", ""));
            if (isBlank(script)) script = trimToNull(text(idea, "scripts", ""));
            if (isBlank(caption)) caption = trimToNull(text(idea, "caption", ""));
            if (isBlank(keyword)) keyword = trimToNull(text(idea, "background_keyword", ""));
            if (isBlank(tiktokAccountOpenId)) tiktokAccountOpenId = trimToNull(text(idea, "tiktok_account_open_id", ""));
            if (isBlank(templateId)) templateId = trimToNull(text(idea, "template_id", ""));
            if (isBlank(qualityProfile)) qualityProfile = trimToNull(text(idea, "quality_profile", ""));
        }

        if (workflowType == VideoWorkflowType.RENDER_TEMPLATE_VIDEO) {
            if (isBlank(templateId)) templateId = "tiktok-scene-sequence";
            if (isBlank(qualityProfile)) qualityProfile = "high";
            if (contentIdeaId != null) {
                Map<String, Object> patch = new LinkedHashMap<>();
                patch.put("template_id", templateId);
                patch.put("quality_profile", qualityProfile);
                contentIdeaGateway.updateContentIdea(contentIdeaId, patch);
            }
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("contentIdeaId", contentIdeaId);
        payload.put("category", category);
        payload.put("ideaCount", normalizeIdeaCount(request.getIdeaCount()));
        payload.put("topic", topic);
        payload.put("script", script);
        payload.put("caption", caption);
        payload.put("keyword", keyword);
        payload.put("tiktokAccountOpenId", tiktokAccountOpenId);
        payload.put("templateId", templateId);
        payload.put("qualityProfile", qualityProfile);
        payload.put("durationSec", request.getDurationSec());
        payload.put("hookStyle", trimToNull(request.getHookStyle()));
        payload.put("scriptFormat", trimToNull(request.getScriptFormat()));
        payload.put("tone", trimToNull(request.getTone()));
        payload.put("audience", trimToNull(request.getAudience()));
        payload.put("durationTarget", trimToNull(request.getDurationTarget()));
        payload.put("language", trimToNull(request.getLanguage()));
        payload.put("temperature", request.getTemperature());
        payload.put("inspirationRef", trimToNull(request.getInspirationRef()));
        payload.put("sceneCount", request.getSceneCount());
        payload.put("selectedSceneMediaUrls", request.getSelectedSceneMediaUrls());
        payload.put("sceneTextStyles", request.getSceneTextStyles());
        payload.put("source", request.getSource());
        payload.put("force", Boolean.TRUE.equals(request.getForce()));
        payload.put("requestedBy", requestedByEmail);
        payload.put("requestedAt", Instant.now().toString());
        return payload;
    }

    public Optional<VideoWorkflowRun> findReusableRun(Long contentIdeaId, VideoWorkflowType workflowType, boolean force) {
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

    public int nextAttemptNumber(Long contentIdeaId, VideoWorkflowType workflowType) {
        long count = contentIdeaId == null
                ? workflowRunRepository.countByContentIdeaIdIsNullAndWorkflowType(workflowType)
                : workflowRunRepository.countByContentIdeaIdAndWorkflowType(contentIdeaId, workflowType);
        return Math.toIntExact(count + 1);
    }

    public VideoWorkflowRun createRun(
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
        run.setRequestPayload(json(objectMapper, payload));
        return runPersistenceHelper.saveAndCommit(run);
    }

    public String buildIdempotencyKey(Long contentIdeaId, VideoWorkflowType workflowType) {
        return workflowType.name() + ":" + (contentIdeaId == null ? "global" : contentIdeaId);
    }

    public void markRunAccepted(VideoWorkflowRun run, String responsePayload) {
        run.setStatus(VideoWorkflowRunStatus.ACCEPTED);
        run.setResponsePayload(responsePayload);
        run.setCompletedAt(Instant.now());
        workflowRunRepository.save(run);
    }

    public void markRunSucceeded(VideoWorkflowRun run, String responsePayload) {
        run.setStatus(VideoWorkflowRunStatus.SUCCEEDED);
        run.setResponsePayload(responsePayload);
        run.setCompletedAt(Instant.now());
        workflowRunRepository.save(run);
    }

    public void markRunFailed(VideoWorkflowRun run, String errorMessage) {
        run.setStatus(VideoWorkflowRunStatus.FAILED);
        run.setErrorMessage(trimToNull(errorMessage));
        run.setCompletedAt(Instant.now());
        workflowRunRepository.save(run);
    }

    public Map<String, Object> payloadWithRunMetadata(Map<String, Object> payload, VideoWorkflowRun run) {
        Map<String, Object> nextPayload = new LinkedHashMap<>(payload);
        nextPayload.put("workflowRunId", run.getId());
        nextPayload.put("attemptNumber", run.getAttemptNumber());
        nextPayload.put("idempotencyKey", run.getIdempotencyKey());
        return nextPayload;
    }

    private void validateWorkflowAcceptance(VideoWorkflowType workflowType, JsonNode response) {
        if (workflowType == VideoWorkflowType.RENDER_TEMPLATE_VIDEO) {
            String shotstackRenderId = trimToNull(response == null ? null : response.path("shotstackRenderId").asText(""));
            if (shotstackRenderId == null) {
                logger.info("video_ops event=render_acceptance_missing_render_id workflowType={} message={}",
                        workflowType,
                        "Le workflow de rendu n'a pas retourne de shotstackRenderId inline. Le backend attend la mise a jour asynchrone.");
            }
        }
    }

    private boolean hasCompletedInitPublishState(Long contentIdeaId, JsonNode response) {
        if (response != null && !response.isMissingNode() && !response.isNull()) {
            String uploadUrl = trimToNull(response.path("uploadUrl").asText(""));
            String status = lower(response.path("status").asText(""));
            if (uploadUrl != null && ("init_done".equals(status) || status.isBlank())) {
                return true;
            }
        }
        if (contentIdeaId == null) {
            return false;
        }
        JsonNode rows = contentIdeaGateway.fetchContentIdeaById(contentIdeaId);
        if (!rows.isArray() || rows.isEmpty()) {
            return false;
        }
        JsonNode idea = rows.get(0);
        String uploadUrl = trimToNull(text(idea, "tiktok_upload_url", ""));
        String uploadStatus = lower(text(idea, "tiktok_upload_status", ""));
        return uploadUrl != null && "init_done".equals(uploadStatus);
    }

    private int normalizeIdeaCount(Integer ideaCount) {
        return ideaCount == null ? 1 : Math.max(1, Math.min(5, ideaCount));
    }
}

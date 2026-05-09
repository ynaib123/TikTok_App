package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.N8nWorkflowContractResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaStatusResponse;
import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoPipelineEventResponse;
import com.tiktokapp.backend.dto.videoops.VideoStatCardResponse;
import com.tiktokapp.backend.dto.videoops.VideoStatusGroupResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunStatusResponse;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.model.VideoPipelineEvent;
import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoPipelineState;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import com.tiktokapp.backend.repository.VideoPipelineEventRepository;
import com.tiktokapp.backend.repository.VideoPipelineStateRepository;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.lower;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.text;
import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.valueOrDefault;

/**
 * Read-side of the videoops domain plus the destructive content-idea deletes.
 * No workflow triggers happen here — those live in
 * {@link ContentGenerationService}, {@link VideoRenderService} and
 * {@link TikTokPublishService}.
 */
@Service
public class ContentReadService {

    private static final Logger logger = LoggerFactory.getLogger(ContentReadService.class);

    public static final int BULK_DELETE_MAX_BATCH = 200;

    private final ContentIdeaGateway contentIdeaGateway;
    private final ContentIdeaRepository contentIdeaRepository;
    private final VideoPipelineStateRepository pipelineStateRepository;
    private final VideoWorkflowRunRepository workflowRunRepository;
    private final VideoPipelineEventRepository eventRepository;
    private final VideoOpsTrackingService trackingService;
    private final N8nWorkflowContractService n8nWorkflowContractService;

    public ContentReadService(
            ContentIdeaGateway contentIdeaGateway,
            ContentIdeaRepository contentIdeaRepository,
            VideoPipelineStateRepository pipelineStateRepository,
            VideoWorkflowRunRepository workflowRunRepository,
            VideoPipelineEventRepository eventRepository,
            VideoOpsTrackingService trackingService,
            N8nWorkflowContractService n8nWorkflowContractService
    ) {
        this.contentIdeaGateway = contentIdeaGateway;
        this.contentIdeaRepository = contentIdeaRepository;
        this.pipelineStateRepository = pipelineStateRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.eventRepository = eventRepository;
        this.trackingService = trackingService;
        this.n8nWorkflowContractService = n8nWorkflowContractService;
    }

    @Transactional(readOnly = true)
    public List<VideoContentIdeaResponse> fetchContentIdeas() {
        JsonNode rows = contentIdeaGateway.fetchContentIdeas();
        List<Long> contentIdeaIds = new ArrayList<>();
        rows.forEach(row -> contentIdeaIds.add(row.path("id").asLong()));
        Map<Long, VideoPipelineState> stateByIdeaId = pipelineStateRepository.findByContentIdeaIdIn(contentIdeaIds).stream()
                .collect(Collectors.toMap(VideoPipelineState::getContentIdeaId, state -> state));

        List<VideoContentIdeaResponse> contentIdeas = new ArrayList<>();
        rows.forEach(row -> {
            Long ideaId = row.path("id").asLong();
            VideoPipelineState state = stateByIdeaId.get(ideaId);
            String shotstackStatus = text(row, "shotstack_status", "unknown");
            String tiktokStatus = text(row, "publish_status", "draft");
            String finalVideoStatus = text(row, "final_video_status", "unknown");
            String shotstackUrl = text(row, "shotstack_url", "");
            String uploadUrl = text(row, "tiktok_upload_url", "");
            VideoPipelineStage stage = VideoOpsStateMachine.resolveFromContentSignals(
                    shotstackStatus,
                    tiktokStatus,
                    finalVideoStatus,
                    shotstackUrl,
                    uploadUrl,
                    state != null ? state.getPipelineStage() : VideoPipelineStage.UNKNOWN
            );
            contentIdeas.add(new VideoContentIdeaResponse(
                    ideaId,
                    text(row, "category", ""),
                    text(row, "topic", ""),
                    text(row, "scripts", ""),
                    text(row, "caption", ""),
                    text(row, "background_keyword", ""),
                    shotstackStatus,
                    tiktokStatus,
                    finalVideoStatus,
                    shotstackUrl,
                    uploadUrl,
                    text(row, "tiktok_account_open_id", ""),
                    stage.name().toLowerCase(Locale.ROOT),
                    state != null ? state.getLastErrorMessage() : null,
                    text(row, "template_id", ""),
                    text(row, "quality_profile", ""),
                    text(row, "render_engine", ""),
                    text(row, "thumbnail_url", "")
            ));
        });
        return contentIdeas;
    }

    @Transactional(readOnly = true)
    public Page<VideoContentIdeaResponse> fetchContentIdeas(Pageable pageable) {
        Page<ContentIdea> contentIdeaPage = contentIdeaRepository.findAllBy(pageable);
        List<Long> contentIdeaIds = contentIdeaPage.getContent().stream().map(ContentIdea::getId).toList();
        Map<Long, VideoPipelineState> stateByIdeaId = pipelineStateRepository.findByContentIdeaIdIn(contentIdeaIds).stream()
                .collect(Collectors.toMap(VideoPipelineState::getContentIdeaId, state -> state));
        return contentIdeaPage.map(idea -> toVideoContentIdeaResponse(idea, stateByIdeaId.get(idea.getId())));
    }

    @Transactional(readOnly = true)
    public VideoContentIdeaResponse fetchContentIdea(long contentIdeaId) {
        ContentIdea idea = contentIdeaRepository.findById(contentIdeaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable."));
        VideoPipelineState state = pipelineStateRepository.findById(contentIdeaId).orElse(null);
        return toVideoContentIdeaResponse(idea, state);
    }

    @Transactional(readOnly = true)
    public List<TikTokAccountResponse> fetchTikTokAccounts() {
        JsonNode rows = contentIdeaGateway.fetchTikTokAccounts();
        List<TikTokAccountResponse> accounts = new ArrayList<>();
        rows.forEach(row -> {
            String openId = text(row, "open_id", "");
            String tokenType = text(row, "token_type", "");
            String scope = text(row, "scope", "");
            String tokenStatus = text(row, "token_status", "ACTIVE");
            boolean hasOauthData = !VideoOpsCommonHelpers.isBlank(openId)
                    || !VideoOpsCommonHelpers.isBlank(tokenType)
                    || !VideoOpsCommonHelpers.isBlank(scope);
            if (!hasOauthData) {
                return;
            }
            accounts.add(new TikTokAccountResponse(
                    row.path("id").asLong(),
                    "account-" + row.path("id").asLong(),
                    openId,
                    scope,
                    "sandbox",
                    tokenStatus
            ));
        });
        return accounts;
    }

    @Transactional(readOnly = true)
    public VideoObservabilityResponse fetchObservability() {
        List<VideoWorkflowRunDetailResponse> recentRuns = workflowRunRepository.findTop8ByOrderByCreatedAtDesc().stream()
                .map(this::toWorkflowRunDetail).toList();
        List<VideoWorkflowRunDetailResponse> failedRuns = workflowRunRepository
                .findTop8ByStatusOrderByCreatedAtDesc(VideoWorkflowRunStatus.FAILED).stream()
                .map(this::toWorkflowRunDetail).toList();
        List<VideoPipelineEventResponse> recentErrors = eventRepository
                .findTop8BySeverityOrderByCreatedAtDesc("ERROR").stream()
                .map(trackingService::toEventResponse).toList();
        List<VideoPipelineEventResponse> recentEvents = eventRepository.findTop8ByOrderByCreatedAtDesc().stream()
                .map(trackingService::toEventResponse).toList();
        N8nWorkflowContractResponse n8nContract = n8nWorkflowContractService.describeContract();
        return new VideoObservabilityResponse(recentRuns, failedRuns, recentErrors, recentEvents, n8nContract);
    }

    @Transactional(readOnly = true)
    public VideoContentIdeaStatusResponse fetchContentIdeaStatus(long contentIdeaId) {
        JsonNode rows = contentIdeaGateway.fetchContentIdeaById(contentIdeaId);
        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable.");
        }
        JsonNode row = rows.get(0);
        VideoPipelineState state = pipelineStateRepository.findById(contentIdeaId).orElse(null);
        VideoWorkflowRun lastRun = workflowRunRepository
                .findTopByContentIdeaIdOrderByCreatedAtDesc(contentIdeaId).orElse(null);
        VideoPipelineEvent lastEvent = eventRepository.findTopByContentIdeaIdOrderByCreatedAtDesc(contentIdeaId);
        VideoPipelineStage stage = VideoOpsStateMachine.resolveFromContentSignals(
                text(row, "shotstack_status", "unknown"),
                text(row, "publish_status", "draft"),
                text(row, "final_video_status", "unknown"),
                text(row, "shotstack_url", ""),
                text(row, "tiktok_upload_url", ""),
                state != null ? state.getPipelineStage() : VideoPipelineStage.UNKNOWN
        );

        return new VideoContentIdeaStatusResponse(
                contentIdeaId,
                text(row, "topic", ""),
                stage.name(),
                VideoOpsStateMachine.describe(stage),
                text(row, "shotstack_status", ""),
                text(row, "final_video_status", ""),
                text(row, "publish_status", ""),
                text(row, "tiktok_upload_status", ""),
                text(row, "tiktok_account_open_id", ""),
                text(row, "shotstack_url", ""),
                text(row, "tiktok_upload_url", ""),
                state == null ? null : state.getLastErrorMessage(),
                lastRun == null ? null : new VideoWorkflowRunDetailResponse(
                        lastRun.getId(),
                        lastRun.getContentIdeaId(),
                        lastRun.getWorkflowType().name(),
                        lastRun.getStatus().name(),
                        lastRun.getAttemptNumber(),
                        lastRun.getErrorMessage(),
                        lastRun.getResponsePayload(),
                        lastRun.getCreatedAt() == null ? null : lastRun.getCreatedAt().toString(),
                        lastRun.getCompletedAt() == null ? null : lastRun.getCompletedAt().toString()
                ),
                lastEvent == null ? null : lastEvent.getMessage(),
                lastEvent == null ? null : lastEvent.getSeverity(),
                state == null || state.getUpdatedAt() == null ? null : state.getUpdatedAt().toString(),
                text(row, "template_id", ""),
                text(row, "quality_profile", ""),
                text(row, "render_engine", ""),
                text(row, "thumbnail_url", "")
        );
    }

    @Transactional(readOnly = true)
    public List<VideoManualActionResponse> fetchManualActions() {
        List<ContentIdea> candidates = contentIdeaRepository.findManualActionCandidates(PageRequest.of(0, 100));
        List<Long> contentIdeaIds = candidates.stream().map(ContentIdea::getId).toList();
        Map<Long, VideoPipelineState> stateByIdeaId = pipelineStateRepository.findByContentIdeaIdIn(contentIdeaIds).stream()
                .collect(Collectors.toMap(VideoPipelineState::getContentIdeaId, state -> state));

        return candidates.stream()
                .map(idea -> toVideoContentIdeaResponse(idea, stateByIdeaId.get(idea.getId())))
                .map(item -> new VideoManualActionResponse(
                        item.getId(),
                        item.getTopic(),
                        item.getShotstackUrl(),
                        item.getUploadUrl(),
                        item.getUploadUrl().isBlank() ? "pending_init_publish" : "init_done",
                        item.getTiktokStatus(),
                        item.getFinalVideoStatus(),
                        item.getShotstackStatus(),
                        item.getPipelineStatus(),
                        item.getLastError(),
                        item.getTemplateId(),
                        item.getQualityProfile(),
                        item.getRenderEngine(),
                        item.getThumbnailUrl()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public VideoDashboardResponse fetchDashboard() {
        List<VideoContentIdeaResponse> ideas = fetchContentIdeas();
        int renderingCount = (int) ideas.stream()
                .filter(item -> List.of("queued", "rendering", "preprocessing").contains(item.getShotstackStatus()))
                .count();
        int readyCount = (int) ideas.stream()
                .filter(item -> "ready".equalsIgnoreCase(item.getFinalVideoStatus()))
                .count();
        int uploadQueueCount = (int) ideas.stream()
                .filter(item -> List.of("uploaded", "uploading").contains(lower(item.getTiktokStatus()))
                        || !item.getUploadUrl().isBlank())
                .count();
        int publishedCount = (int) ideas.stream()
                .filter(item -> "published".equalsIgnoreCase(item.getTiktokStatus()))
                .count();

        List<VideoWorkflowRunResponse> recentRuns = workflowRunRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(run -> new VideoWorkflowRunResponse(
                        run.getId(),
                        run.getContentIdeaId(),
                        run.getWorkflowType().name(),
                        run.getStatus().name(),
                        run.getAttemptNumber(),
                        run.getErrorMessage(),
                        run.getCreatedAt().toString()
                ))
                .toList();

        return new VideoDashboardResponse(
                List.of(
                        new VideoStatCardResponse("Content Ideas", String.valueOf(ideas.size()), "neutral"),
                        new VideoStatCardResponse("Renders In Progress", String.valueOf(renderingCount), "accent"),
                        new VideoStatCardResponse("Ready To Publish", String.valueOf(readyCount), "success"),
                        new VideoStatCardResponse("Manual Upload Queue", String.valueOf(uploadQueueCount), "warning")
                ),
                List.of(
                        new VideoStatusGroupResponse("Queued", (int) ideas.stream()
                                .filter(item -> "queued".equalsIgnoreCase(item.getShotstackStatus())).count()),
                        new VideoStatusGroupResponse("Rendering", renderingCount),
                        new VideoStatusGroupResponse("Ready", readyCount),
                        new VideoStatusGroupResponse("Published", publishedCount)
                ),
                recentRuns
        );
    }

    @Transactional(readOnly = true)
    public VideoWorkflowRunDetailResponse fetchWorkflowRun(long runId) {
        VideoWorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "workflowRun introuvable."));
        return new VideoWorkflowRunDetailResponse(
                run.getId(),
                run.getContentIdeaId(),
                run.getWorkflowType().name(),
                run.getStatus().name(),
                run.getAttemptNumber(),
                run.getErrorMessage(),
                run.getResponsePayload(),
                run.getCreatedAt() == null ? null : run.getCreatedAt().toString(),
                run.getCompletedAt() == null ? null : run.getCompletedAt().toString()
        );
    }

    @Transactional(readOnly = true)
    public VideoWorkflowRunStatusResponse fetchWorkflowRunStatus(long runId) {
        VideoWorkflowRun run = workflowRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "workflowRun introuvable."));
        VideoWorkflowRunStatus status = run.getStatus();
        boolean terminal = status == VideoWorkflowRunStatus.SUCCEEDED || status == VideoWorkflowRunStatus.FAILED;
        long ageMs = run.getCreatedAt() == null
                ? 0L
                : Math.max(0L, Duration.between(run.getCreatedAt(), Instant.now()).toMillis());
        return new VideoWorkflowRunStatusResponse(
                run.getId(),
                run.getWorkflowType() == null ? null : run.getWorkflowType().name(),
                status == null ? null : status.name(),
                ageMs,
                terminal,
                run.getErrorMessage(),
                run.getCreatedAt() == null ? null : run.getCreatedAt().toString(),
                run.getCompletedAt() == null ? null : run.getCompletedAt().toString()
        );
    }

    @Transactional
    public void deleteContentIdea(long contentIdeaId) {
        if (!contentIdeaRepository.existsById(contentIdeaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Idée introuvable.");
        }
        eventRepository.deleteByContentIdeaId(contentIdeaId);
        workflowRunRepository.deleteByContentIdeaId(contentIdeaId);
        if (pipelineStateRepository.existsById(contentIdeaId)) {
            pipelineStateRepository.deleteById(contentIdeaId);
        }
        contentIdeaRepository.deleteById(contentIdeaId);
        logger.info("video_ops event=content_idea_deleted contentIdeaId={}", contentIdeaId);
    }

    @Transactional
    public void deleteContentIdeasBulk(List<Long> contentIdeaIds) {
        if (contentIdeaIds == null || contentIdeaIds.isEmpty()) {
            return;
        }
        if (contentIdeaIds.size() > BULK_DELETE_MAX_BATCH) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Suppression de plus de " + BULK_DELETE_MAX_BATCH + " idees interdite.");
        }
        eventRepository.deleteByContentIdeaIdIn(contentIdeaIds);
        workflowRunRepository.deleteByContentIdeaIdIn(contentIdeaIds);
        pipelineStateRepository.deleteAllById(contentIdeaIds);
        contentIdeaRepository.deleteAllByIdInBatch(contentIdeaIds);
        logger.info("video_ops event=content_ideas_bulk_deleted count={}", contentIdeaIds.size());
    }

    private VideoWorkflowRunDetailResponse toWorkflowRunDetail(VideoWorkflowRun run) {
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

    private VideoContentIdeaResponse toVideoContentIdeaResponse(ContentIdea idea, VideoPipelineState state) {
        String shotstackStatus = valueOrDefault(idea.getShotstackStatus(), "unknown");
        String tiktokStatus = valueOrDefault(idea.getPublishStatus(), "draft");
        String finalVideoStatus = valueOrDefault(idea.getFinalVideoStatus(), "unknown");
        String shotstackUrl = valueOrDefault(idea.getShotstackUrl(), "");
        String uploadUrl = valueOrDefault(idea.getTiktokUploadUrl(), "");
        VideoPipelineStage stage = VideoOpsStateMachine.resolveFromContentSignals(
                shotstackStatus,
                tiktokStatus,
                finalVideoStatus,
                shotstackUrl,
                uploadUrl,
                state != null ? state.getPipelineStage() : VideoPipelineStage.UNKNOWN
        );
        return new VideoContentIdeaResponse(
                idea.getId(),
                valueOrDefault(idea.getCategory(), ""),
                valueOrDefault(idea.getTopic(), ""),
                valueOrDefault(idea.getScripts(), ""),
                valueOrDefault(idea.getCaption(), ""),
                valueOrDefault(idea.getBackgroundKeyword(), ""),
                shotstackStatus,
                tiktokStatus,
                finalVideoStatus,
                shotstackUrl,
                uploadUrl,
                valueOrDefault(idea.getTiktokAccountOpenId(), ""),
                stage.name().toLowerCase(Locale.ROOT),
                state != null ? state.getLastErrorMessage() : null,
                valueOrDefault(idea.getTemplateId(), ""),
                valueOrDefault(idea.getQualityProfile(), ""),
                valueOrDefault(idea.getRenderEngine(), ""),
                valueOrDefault(idea.getThumbnailUrl(), "")
        );
    }
}

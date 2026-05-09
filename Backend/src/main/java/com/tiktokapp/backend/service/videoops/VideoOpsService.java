package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaStatusResponse;
import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunStatusResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Thin façade over the four extracted services kept for backwards compatibility
 * with existing call sites (controllers, batch jobs, callback replay). New code
 * should depend directly on the focused services :
 *
 * <ul>
 *     <li>{@link ContentReadService} — reads + deletes</li>
 *     <li>{@link ContentGenerationService} — main pipeline trigger</li>
 *     <li>{@link VideoRenderService} — Remotion render trigger</li>
 *     <li>{@link TikTokPublishService} — init publish, upload, mark publish complete</li>
 *     <li>{@link WorkflowCallbackService} — async run completion + HMAC validation</li>
 * </ul>
 */
@Service
public class VideoOpsService {

    public static final int BULK_DELETE_MAX_BATCH = ContentReadService.BULK_DELETE_MAX_BATCH;

    private final ContentReadService contentReadService;
    private final ContentGenerationService contentGenerationService;
    private final VideoRenderService videoRenderService;
    private final TikTokPublishService tikTokPublishService;
    private final WorkflowCallbackService workflowCallbackService;

    public VideoOpsService(
            ContentReadService contentReadService,
            ContentGenerationService contentGenerationService,
            VideoRenderService videoRenderService,
            TikTokPublishService tikTokPublishService,
            WorkflowCallbackService workflowCallbackService
    ) {
        this.contentReadService = contentReadService;
        this.contentGenerationService = contentGenerationService;
        this.videoRenderService = videoRenderService;
        this.tikTokPublishService = tikTokPublishService;
        this.workflowCallbackService = workflowCallbackService;
    }

    public List<VideoContentIdeaResponse> fetchContentIdeas() {
        return contentReadService.fetchContentIdeas();
    }

    public Page<VideoContentIdeaResponse> fetchContentIdeas(Pageable pageable) {
        return contentReadService.fetchContentIdeas(pageable);
    }

    public VideoContentIdeaResponse fetchContentIdea(long contentIdeaId) {
        return contentReadService.fetchContentIdea(contentIdeaId);
    }

    public List<TikTokAccountResponse> fetchTikTokAccounts() {
        return contentReadService.fetchTikTokAccounts();
    }

    public VideoObservabilityResponse fetchObservability() {
        return contentReadService.fetchObservability();
    }

    public VideoContentIdeaStatusResponse fetchContentIdeaStatus(long contentIdeaId) {
        return contentReadService.fetchContentIdeaStatus(contentIdeaId);
    }

    public List<VideoManualActionResponse> fetchManualActions() {
        return contentReadService.fetchManualActions();
    }

    public VideoDashboardResponse fetchDashboard() {
        return contentReadService.fetchDashboard();
    }

    public VideoWorkflowRunDetailResponse fetchWorkflowRun(long runId) {
        return contentReadService.fetchWorkflowRun(runId);
    }

    public VideoWorkflowRunStatusResponse fetchWorkflowRunStatus(long runId) {
        return contentReadService.fetchWorkflowRunStatus(runId);
    }

    public void deleteContentIdea(long contentIdeaId) {
        contentReadService.deleteContentIdea(contentIdeaId);
    }

    public void deleteContentIdeasBulk(List<Long> contentIdeaIds) {
        contentReadService.deleteContentIdeasBulk(contentIdeaIds);
    }

    public VideoWorkflowActionResponse triggerMainPipeline(WorkflowTriggerRequest request, String requestedByEmail) {
        return contentGenerationService.triggerMainPipeline(request, requestedByEmail);
    }

    public VideoWorkflowActionResponse triggerCheckShotstack(WorkflowTriggerRequest request, String requestedByEmail) {
        return videoRenderService.triggerCheckShotstack(request, requestedByEmail);
    }

    public VideoWorkflowActionResponse triggerRenderTemplate(WorkflowTriggerRequest request, String requestedByEmail) {
        return videoRenderService.triggerRenderTemplate(request, requestedByEmail);
    }

    public VideoWorkflowActionResponse triggerInitPublish(WorkflowTriggerRequest request, String requestedByEmail) {
        return tikTokPublishService.triggerInitPublish(request, requestedByEmail);
    }

    public TikTokUploadResponse uploadTikTokMedia(
            long contentIdeaId,
            String shotstackUrl,
            String uploadUrl,
            boolean force,
            String requestedByEmail
    ) {
        return tikTokPublishService.uploadTikTokMedia(contentIdeaId, shotstackUrl, uploadUrl, force, requestedByEmail);
    }

    public VideoWorkflowActionResponse markPublishComplete(long contentIdeaId, String requestedByEmail) {
        return tikTokPublishService.markPublishComplete(contentIdeaId, requestedByEmail);
    }

    public VideoWorkflowRunDetailResponse completeWorkflowRun(long runId, VideoWorkflowRunCompletionRequest request) {
        return workflowCallbackService.completeRun(runId, request, null);
    }

    public VideoWorkflowRunDetailResponse completeWorkflowRun(long runId, VideoWorkflowRunCompletionRequest request, String idempotencyKey) {
        return workflowCallbackService.completeRun(runId, request, idempotencyKey);
    }

    public void validateWorkflowCallbackRequest(String method, String path, String body, String timestamp, String signature, String legacySecret) {
        workflowCallbackService.validateCallback(method, path, body, timestamp, signature, legacySecret);
    }
}

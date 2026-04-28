package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoManualActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoUploadRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/video-ops")
public class VideoOpsController {

    private final VideoOpsService videoOpsService;

    public VideoOpsController(VideoOpsService videoOpsService) {
        this.videoOpsService = videoOpsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<VideoDashboardResponse> getDashboard() {
        return ResponseEntity.ok(videoOpsService.fetchDashboard());
    }

    @GetMapping("/content-ideas")
    public ResponseEntity<List<VideoContentIdeaResponse>> getContentIdeas() {
        return ResponseEntity.ok(videoOpsService.fetchContentIdeas());
    }

    @GetMapping("/manual-actions")
    public ResponseEntity<List<VideoManualActionResponse>> getManualActions() {
        return ResponseEntity.ok(videoOpsService.fetchManualActions());
    }

    @GetMapping("/tiktok-accounts")
    public ResponseEntity<List<TikTokAccountResponse>> getTikTokAccounts() {
        return ResponseEntity.ok(videoOpsService.fetchTikTokAccounts());
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
}

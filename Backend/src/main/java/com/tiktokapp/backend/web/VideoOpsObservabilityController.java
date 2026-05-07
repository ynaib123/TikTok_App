package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoOpsHealthResponse;
import com.tiktokapp.backend.service.videoops.VideoOpsHealthService;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Phase 2.2 split — read-only health, dashboard and observability endpoints
 * extracted from VideoOpsController to keep the god-class slimmer.
 * URL paths are unchanged.
 */
@RestController
@RequestMapping("/api/video-ops")
public class VideoOpsObservabilityController {

    private final VideoOpsService videoOpsService;
    private final VideoOpsHealthService videoOpsHealthService;

    public VideoOpsObservabilityController(
            VideoOpsService videoOpsService,
            VideoOpsHealthService videoOpsHealthService
    ) {
        this.videoOpsService = videoOpsService;
        this.videoOpsHealthService = videoOpsHealthService;
    }

    @GetMapping("/health")
    public ResponseEntity<VideoOpsHealthResponse> getVideoOpsHealth() {
        VideoOpsHealthResponse health = videoOpsHealthService.buildHealth();
        HttpStatus status = "DOWN".equals(health.status()) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
        return ResponseEntity.status(status).body(health);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<VideoDashboardResponse> getDashboard() {
        return ResponseEntity.ok(videoOpsService.fetchDashboard());
    }

    @GetMapping("/observability")
    public ResponseEntity<VideoObservabilityResponse> getObservability() {
        return ResponseEntity.ok(videoOpsService.fetchObservability());
    }
}

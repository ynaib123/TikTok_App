package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class VideoObservabilityResponse {

    private final List<VideoWorkflowRunDetailResponse> recentRuns;
    private final List<VideoWorkflowRunDetailResponse> failedRuns;
    private final List<VideoPipelineEventResponse> recentErrors;
    private final List<VideoPipelineEventResponse> recentEvents;

    public VideoObservabilityResponse(
            List<VideoWorkflowRunDetailResponse> recentRuns,
            List<VideoWorkflowRunDetailResponse> failedRuns,
            List<VideoPipelineEventResponse> recentErrors,
            List<VideoPipelineEventResponse> recentEvents
    ) {
        this.recentRuns = recentRuns;
        this.failedRuns = failedRuns;
        this.recentErrors = recentErrors;
        this.recentEvents = recentEvents;
    }

    public List<VideoWorkflowRunDetailResponse> getRecentRuns() {
        return recentRuns;
    }

    public List<VideoWorkflowRunDetailResponse> getFailedRuns() {
        return failedRuns;
    }

    public List<VideoPipelineEventResponse> getRecentErrors() {
        return recentErrors;
    }

    public List<VideoPipelineEventResponse> getRecentEvents() {
        return recentEvents;
    }
}

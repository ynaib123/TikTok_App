package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class VideoObservabilityResponse {

    private final List<VideoWorkflowRunDetailResponse> recentRuns;
    private final List<VideoWorkflowRunDetailResponse> failedRuns;
    private final List<VideoPipelineEventResponse> recentErrors;
    private final List<VideoPipelineEventResponse> recentEvents;
    private final N8nWorkflowContractResponse n8nContract;

    public VideoObservabilityResponse(
            List<VideoWorkflowRunDetailResponse> recentRuns,
            List<VideoWorkflowRunDetailResponse> failedRuns,
            List<VideoPipelineEventResponse> recentErrors,
            List<VideoPipelineEventResponse> recentEvents,
            N8nWorkflowContractResponse n8nContract
    ) {
        this.recentRuns = recentRuns;
        this.failedRuns = failedRuns;
        this.recentErrors = recentErrors;
        this.recentEvents = recentEvents;
        this.n8nContract = n8nContract;
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

    public N8nWorkflowContractResponse getN8nContract() {
        return n8nContract;
    }
}

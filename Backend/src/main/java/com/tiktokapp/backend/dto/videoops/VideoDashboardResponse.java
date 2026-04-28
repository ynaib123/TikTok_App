package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class VideoDashboardResponse {

    private final List<VideoStatCardResponse> stats;
    private final List<VideoStatusGroupResponse> groups;
    private final List<VideoWorkflowRunResponse> recentRuns;

    public VideoDashboardResponse(
            List<VideoStatCardResponse> stats,
            List<VideoStatusGroupResponse> groups,
            List<VideoWorkflowRunResponse> recentRuns
    ) {
        this.stats = stats;
        this.groups = groups;
        this.recentRuns = recentRuns;
    }

    public List<VideoStatCardResponse> getStats() {
        return stats;
    }

    public List<VideoStatusGroupResponse> getGroups() {
        return groups;
    }

    public List<VideoWorkflowRunResponse> getRecentRuns() {
        return recentRuns;
    }
}

package com.tiktokapp.backend.dto.videoops;

import org.springframework.data.domain.Page;

import java.util.List;

public class VideoOpsBootstrapResponse {

    private final AccountsOverviewResponse accountsOverview;
    private final AccountsReadinessResponse accountsReadiness;
    private final Page<VideoContentIdeaResponse> contentIdeas;
    private final List<VideoManualActionResponse> manualActions;

    public VideoOpsBootstrapResponse(
            AccountsOverviewResponse accountsOverview,
            AccountsReadinessResponse accountsReadiness,
            Page<VideoContentIdeaResponse> contentIdeas,
            List<VideoManualActionResponse> manualActions
    ) {
        this.accountsOverview = accountsOverview;
        this.accountsReadiness = accountsReadiness;
        this.contentIdeas = contentIdeas;
        this.manualActions = manualActions;
    }

    public AccountsOverviewResponse getAccountsOverview() {
        return accountsOverview;
    }

    public AccountsReadinessResponse getAccountsReadiness() {
        return accountsReadiness;
    }

    public Page<VideoContentIdeaResponse> getContentIdeas() {
        return contentIdeas;
    }

    public List<VideoManualActionResponse> getManualActions() {
        return manualActions;
    }
}

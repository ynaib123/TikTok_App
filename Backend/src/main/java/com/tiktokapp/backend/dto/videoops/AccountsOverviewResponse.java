package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class AccountsOverviewResponse {

    private final List<TikTokAccountResponse> tiktokAccounts;
    private final List<ServiceConnectionResponse> serviceConnections;
    private final AccountsReadinessResponse readiness;

    public AccountsOverviewResponse(
            List<TikTokAccountResponse> tiktokAccounts,
            List<ServiceConnectionResponse> serviceConnections,
            AccountsReadinessResponse readiness
    ) {
        this.tiktokAccounts = tiktokAccounts;
        this.serviceConnections = serviceConnections;
        this.readiness = readiness;
    }

    public List<TikTokAccountResponse> getTiktokAccounts() {
        return tiktokAccounts;
    }

    public List<ServiceConnectionResponse> getServiceConnections() {
        return serviceConnections;
    }

    public AccountsReadinessResponse getReadiness() {
        return readiness;
    }
}

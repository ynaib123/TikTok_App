package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public class AccountsReadinessResponse {

    private final boolean ready;
    private final int connectedTikTokAccounts;
    private final List<String> missingItems;

    public AccountsReadinessResponse(boolean ready, int connectedTikTokAccounts, List<String> missingItems) {
        this.ready = ready;
        this.connectedTikTokAccounts = connectedTikTokAccounts;
        this.missingItems = missingItems;
    }

    public boolean isReady() {
        return ready;
    }

    public int getConnectedTikTokAccounts() {
        return connectedTikTokAccounts;
    }

    public List<String> getMissingItems() {
        return missingItems;
    }
}

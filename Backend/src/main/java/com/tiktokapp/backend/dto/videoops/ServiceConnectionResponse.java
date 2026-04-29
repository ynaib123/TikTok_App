package com.tiktokapp.backend.dto.videoops;

public class ServiceConnectionResponse {

    private final Long id;
    private final String providerKey;
    private final String displayName;
    private final String baseUrl;
    private final String accountIdentifier;
    private final boolean hasSecret;
    private final String status;
    private final String connectedAt;
    private final String lastValidatedAt;

    public ServiceConnectionResponse(
            Long id,
            String providerKey,
            String displayName,
            String baseUrl,
            String accountIdentifier,
            boolean hasSecret,
            String status,
            String connectedAt,
            String lastValidatedAt
    ) {
        this.id = id;
        this.providerKey = providerKey;
        this.displayName = displayName;
        this.baseUrl = baseUrl;
        this.accountIdentifier = accountIdentifier;
        this.hasSecret = hasSecret;
        this.status = status;
        this.connectedAt = connectedAt;
        this.lastValidatedAt = lastValidatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getProviderKey() {
        return providerKey;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getAccountIdentifier() {
        return accountIdentifier;
    }

    public boolean isHasSecret() {
        return hasSecret;
    }

    public String getStatus() {
        return status;
    }

    public String getConnectedAt() {
        return connectedAt;
    }

    public String getLastValidatedAt() {
        return lastValidatedAt;
    }
}

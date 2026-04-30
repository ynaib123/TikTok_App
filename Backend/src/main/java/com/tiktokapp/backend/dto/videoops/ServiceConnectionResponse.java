package com.tiktokapp.backend.dto.videoops;

public class ServiceConnectionResponse {

    private final Long id;
    private final String providerKey;
    private final String displayName;
    private final String baseUrl;
    private final String accountIdentifier;
    private final String metadataJson;
    private final boolean hasSecret;
    private final String status;
    private final boolean active;
    private final String validationStatus;
    private final String validationMessage;
    private final String connectedAt;
    private final String lastValidatedAt;

    public ServiceConnectionResponse(
            Long id,
            String providerKey,
            String displayName,
            String baseUrl,
            String accountIdentifier,
            String metadataJson,
            boolean hasSecret,
            String status,
            boolean active,
            String validationStatus,
            String validationMessage,
            String connectedAt,
            String lastValidatedAt
    ) {
        this.id = id;
        this.providerKey = providerKey;
        this.displayName = displayName;
        this.baseUrl = baseUrl;
        this.accountIdentifier = accountIdentifier;
        this.metadataJson = metadataJson;
        this.hasSecret = hasSecret;
        this.status = status;
        this.active = active;
        this.validationStatus = validationStatus;
        this.validationMessage = validationMessage;
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

    public String getMetadataJson() {
        return metadataJson;
    }

    public boolean isHasSecret() {
        return hasSecret;
    }

    public String getStatus() {
        return status;
    }

    public boolean isActive() {
        return active;
    }

    public String getValidationStatus() {
        return validationStatus;
    }

    public String getValidationMessage() {
        return validationMessage;
    }

    public String getConnectedAt() {
        return connectedAt;
    }

    public String getLastValidatedAt() {
        return lastValidatedAt;
    }
}

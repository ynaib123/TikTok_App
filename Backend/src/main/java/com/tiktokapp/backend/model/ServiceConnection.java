package com.tiktokapp.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "service_connections")
public class ServiceConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_key", nullable = false, length = 40)
    private ServiceConnectionProvider providerKey;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(name = "account_identifier", length = 255)
    private String accountIdentifier;

    @Column(name = "secret_value", columnDefinition = "text")
    private String secretValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ServiceConnectionStatus status = ServiceConnectionStatus.DISCONNECTED;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_validation_status", length = 24)
    private ServiceConnectionValidationStatus lastValidationStatus = ServiceConnectionValidationStatus.UNKNOWN;

    @Column(name = "last_validation_message", length = 500)
    private String lastValidationMessage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "connected_at")
    private Instant connectedAt;

    @Column(name = "last_validated_at")
    private Instant lastValidatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public ServiceConnectionProvider getProviderKey() {
        return providerKey;
    }

    public void setProviderKey(ServiceConnectionProvider providerKey) {
        this.providerKey = providerKey;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getAccountIdentifier() {
        return accountIdentifier;
    }

    public void setAccountIdentifier(String accountIdentifier) {
        this.accountIdentifier = accountIdentifier;
    }

    public String getSecretValue() {
        return secretValue;
    }

    public void setSecretValue(String secretValue) {
        this.secretValue = secretValue;
    }

    public ServiceConnectionStatus getStatus() {
        return status;
    }

    public void setStatus(ServiceConnectionStatus status) {
        this.status = status;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public Instant getConnectedAt() {
        return connectedAt;
    }

    public void setConnectedAt(Instant connectedAt) {
        this.connectedAt = connectedAt;
    }

    public Instant getLastValidatedAt() {
        return lastValidatedAt;
    }

    public void setLastValidatedAt(Instant lastValidatedAt) {
        this.lastValidatedAt = lastValidatedAt;
    }

    public ServiceConnectionValidationStatus getLastValidationStatus() {
        return lastValidationStatus;
    }

    public void setLastValidationStatus(ServiceConnectionValidationStatus lastValidationStatus) {
        this.lastValidationStatus = lastValidationStatus;
    }

    public String getLastValidationMessage() {
        return lastValidationMessage;
    }

    public void setLastValidationMessage(String lastValidationMessage) {
        this.lastValidationMessage = lastValidationMessage;
    }
}

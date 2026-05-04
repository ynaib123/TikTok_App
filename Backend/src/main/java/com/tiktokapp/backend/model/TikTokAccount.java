package com.tiktokapp.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tiktok_accounts")
public class TikTokAccount {

    public enum TokenStatus {
        ACTIVE,
        TOKEN_REFRESH_REQUIRED,
        TOKEN_EXPIRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "open_id")
    private String openId;
    @Column(name = "access_token")
    private String accessToken;
    @Column(name = "refresh_token")
    private String refreshToken;
    private String scope;
    @Column(name = "token_type")
    private String tokenType;
    @Enumerated(EnumType.STRING)
    @Column(name = "token_status", nullable = false, length = 32)
    private TokenStatus tokenStatus = TokenStatus.ACTIVE;
    @Column(name = "access_token_expires_at")
    private Instant accessTokenExpiresAt;
    @Column(name = "refresh_token_expires_at")
    private Instant refreshTokenExpiresAt;
    @Column(name = "last_token_refresh_at")
    private Instant lastTokenRefreshAt;
    @Column(name = "last_token_refresh_error", length = 500)
    private String lastTokenRefreshError;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOpenId() { return openId; }
    public void setOpenId(String openId) { this.openId = openId; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    public TokenStatus getTokenStatus() { return tokenStatus; }
    public void setTokenStatus(TokenStatus tokenStatus) { this.tokenStatus = tokenStatus; }
    public Instant getAccessTokenExpiresAt() { return accessTokenExpiresAt; }
    public void setAccessTokenExpiresAt(Instant accessTokenExpiresAt) { this.accessTokenExpiresAt = accessTokenExpiresAt; }
    public Instant getRefreshTokenExpiresAt() { return refreshTokenExpiresAt; }
    public void setRefreshTokenExpiresAt(Instant refreshTokenExpiresAt) { this.refreshTokenExpiresAt = refreshTokenExpiresAt; }
    public Instant getLastTokenRefreshAt() { return lastTokenRefreshAt; }
    public void setLastTokenRefreshAt(Instant lastTokenRefreshAt) { this.lastTokenRefreshAt = lastTokenRefreshAt; }
    public String getLastTokenRefreshError() { return lastTokenRefreshError; }
    public void setLastTokenRefreshError(String lastTokenRefreshError) { this.lastTokenRefreshError = lastTokenRefreshError; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

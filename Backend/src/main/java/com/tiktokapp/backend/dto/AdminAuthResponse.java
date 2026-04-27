package com.tiktokapp.backend.dto;

public class AdminAuthResponse {

    private String token;
    private String refreshToken;
    private long expiresInSeconds;
    private AdminProfileResponse admin;
    private String role;

    public AdminAuthResponse(String token, String refreshToken, long expiresInSeconds, AdminProfileResponse admin, String role) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.expiresInSeconds = expiresInSeconds;
        this.admin = admin;
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public long getExpiresInSeconds() {
        return expiresInSeconds;
    }

    public AdminProfileResponse getAdmin() {
        return admin;
    }

    public String getRole() {
        return role;
    }
}

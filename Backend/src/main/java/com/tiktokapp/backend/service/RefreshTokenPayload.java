package com.tiktokapp.backend.service;

import java.time.Instant;

public record RefreshTokenPayload(String token, String jti, Instant expiresAt) {
}

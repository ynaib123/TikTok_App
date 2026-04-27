package com.tiktokapp.backend.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InMemoryRefreshTokenStore {

    private final Map<String, StoredRefreshToken> activeTokens = new ConcurrentHashMap<>();

    public void store(String jti, String token, Instant expiresAt) {
        activeTokens.put(jti, new StoredRefreshToken(token, expiresAt));
    }

    public boolean isActive(String jti, String token) {
        StoredRefreshToken stored = activeTokens.get(jti);
        if (stored == null) {
            return false;
        }
        if (stored.expiresAt().isBefore(Instant.now())) {
            activeTokens.remove(jti);
            return false;
        }
        return stored.token().equals(token);
    }

    public void revoke(String jti) {
        if (jti == null || jti.isBlank()) {
            return;
        }
        activeTokens.remove(jti);
    }

    private record StoredRefreshToken(String token, Instant expiresAt) {
    }
}

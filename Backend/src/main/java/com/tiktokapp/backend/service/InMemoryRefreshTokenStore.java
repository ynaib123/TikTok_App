package com.tiktokapp.backend.service;

import com.tiktokapp.backend.model.AdminRefreshTokenEntity;
import com.tiktokapp.backend.repository.AdminRefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Phase 1.6 — JPA-backed refresh token store. Class name kept for
 * backward compatibility with existing callers (AdminAuthController).
 * Despite the name, this is now persistent across restarts.
 */
@Service
public class InMemoryRefreshTokenStore {

    private static final Logger logger = LoggerFactory.getLogger(InMemoryRefreshTokenStore.class);

    private final AdminRefreshTokenRepository repository;

    public InMemoryRefreshTokenStore(AdminRefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void store(String jti, String token, Instant expiresAt) {
        if (jti == null || jti.isBlank() || token == null || expiresAt == null) {
            return;
        }
        AdminRefreshTokenEntity entity = repository.findById(jti)
                .orElseGet(() -> new AdminRefreshTokenEntity(jti, token, expiresAt));
        repository.save(entity);
    }

    @Transactional(readOnly = true)
    public boolean isActive(String jti, String token) {
        if (jti == null || jti.isBlank() || token == null) {
            return false;
        }
        return repository.findById(jti)
                .map(entity -> {
                    if (entity.getRevokedAt() != null) return false;
                    if (entity.getExpiresAt().isBefore(Instant.now())) return false;
                    return entity.getTokenValue().equals(token);
                })
                .orElse(false);
    }

    @Transactional
    public void revoke(String jti) {
        if (jti == null || jti.isBlank()) {
            return;
        }
        repository.findById(jti).ifPresent(entity -> {
            entity.revoke();
            repository.save(entity);
        });
    }

    /** Cleanup expired/revoked tokens older than 7 days, daily at 03:00 server time. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpired() {
        Instant cutoff = Instant.now().minusSeconds(7L * 24 * 3600);
        int deleted = repository.deleteExpiredOrRevokedBefore(cutoff);
        if (deleted > 0) {
            logger.info("admin refresh tokens cleanup deleted={}", deleted);
        }
    }
}

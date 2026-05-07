package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.AdminRefreshTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

public interface AdminRefreshTokenRepository extends JpaRepository<AdminRefreshTokenEntity, String> {

    @Modifying
    @Transactional
    @Query("DELETE FROM AdminRefreshTokenEntity t WHERE t.expiresAt < :cutoff OR (t.revokedAt IS NOT NULL AND t.revokedAt < :cutoff)")
    int deleteExpiredOrRevokedBefore(@Param("cutoff") Instant cutoff);
}

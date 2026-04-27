package com.tiktokapp.backend.service;

import com.tiktokapp.backend.config.SecurityProperties;
import com.tiktokapp.backend.dto.AdminProfileResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long accessMinutes;
    private final long refreshDays;

    public JwtService(SecurityProperties securityProperties) {
        String jwtSecret = securityProperties.getJwtSecret();
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("app.security.jwt-secret must contain at least 32 characters");
        }
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.accessMinutes = securityProperties.getAccessMinutes();
        this.refreshDays = securityProperties.getRefreshDays();
    }

    public String generateAdminAccessToken(AdminProfileResponse admin) {
        Instant now = Instant.now();
        Instant expiry = now.plus(accessMinutes, ChronoUnit.MINUTES);
        return Jwts.builder()
                .subject(admin.getEmail())
                .claim("adminId", admin.getId())
                .claim("role", "ADMIN")
                .claim("tokenType", "ACCESS")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    public RefreshTokenPayload generateAdminRefreshToken(AdminProfileResponse admin, boolean rememberMe) {
        Instant now = Instant.now();
        Instant expiry = now.plus(refreshDays, ChronoUnit.DAYS);
        String jti = UUID.randomUUID().toString();
        String token = Jwts.builder()
                .subject(admin.getEmail())
                .id(jti)
                .claim("adminId", admin.getId())
                .claim("role", "ADMIN")
                .claim("rememberMe", rememberMe)
                .claim("tokenType", "REFRESH")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();

        return new RefreshTokenPayload(token, jti, expiry);
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessTokenTtlSeconds() {
        return ChronoUnit.MINUTES.getDuration().getSeconds() * accessMinutes;
    }
}

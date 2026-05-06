package com.tiktokapp.backend.web;

import com.tiktokapp.backend.config.RefreshCookieService;
import com.tiktokapp.backend.dto.AdminAuthResponse;
import com.tiktokapp.backend.dto.AdminProfileResponse;
import com.tiktokapp.backend.dto.LoginRequest;
import com.tiktokapp.backend.dto.RefreshTokenRequest;
import com.tiktokapp.backend.service.AdminAuthService;
import com.tiktokapp.backend.service.AuditService;
import com.tiktokapp.backend.service.InMemoryRefreshTokenStore;
import com.tiktokapp.backend.service.JwtService;
import com.tiktokapp.backend.service.RefreshTokenPayload;
import java.util.HashMap;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/admins")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;
    private final JwtService jwtService;
    private final InMemoryRefreshTokenStore refreshTokenStore;
    private final RefreshCookieService refreshCookieService;
    private final AuditService auditService;

    public AdminAuthController(
            AdminAuthService adminAuthService,
            JwtService jwtService,
            InMemoryRefreshTokenStore refreshTokenStore,
            RefreshCookieService refreshCookieService,
            AuditService auditService
    ) {
        this.adminAuthService = adminAuthService;
        this.jwtService = jwtService;
        this.refreshTokenStore = refreshTokenStore;
        this.refreshCookieService = refreshCookieService;
        this.auditService = auditService;
    }

    @GetMapping("/csrf-token")
    public ResponseEntity<Map<String, String>> getCsrfToken(CsrfToken csrfToken) {
        return ResponseEntity.ok(Map.of(
                "token", csrfToken.getToken(),
                "headerName", csrfToken.getHeaderName()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AdminAuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AdminProfileResponse admin;
        try {
            admin = adminAuthService.authenticate(request.getEmail(), request.getMotDePasse())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identifiants administrateur invalides."));
        } catch (ResponseStatusException ex) {
            HashMap<String, Object> failPayload = new HashMap<>();
            failPayload.put("email", request.getEmail());
            failPayload.put("rememberMe", Boolean.TRUE.equals(request.getRememberMe()));
            auditService.log(null, request.getEmail(), "admin.login.failed", "admin", null, failPayload);
            throw ex;
        }

        boolean rememberMe = Boolean.TRUE.equals(request.getRememberMe());
        HashMap<String, Object> payload = new HashMap<>();
        payload.put("rememberMe", rememberMe);
        auditService.log(admin.getId(), admin.getEmail(), "admin.login", "admin", String.valueOf(admin.getId()), payload);
        return buildAuthResponse(admin, rememberMe);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AdminAuthResponse> refresh(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest servletRequest
    ) {
        String rawRefreshToken = resolveRefreshToken(servletRequest, request);
        if (rawRefreshToken == null) {
            return unauthorizedResponse();
        }

        try {
            Claims claims = jwtService.parseToken(rawRefreshToken);
            String tokenType = claims.get("tokenType", String.class);
            String role = claims.get("role", String.class);
            String jti = claims.getId();
            if (!"REFRESH".equalsIgnoreCase(tokenType) || !"ADMIN".equalsIgnoreCase(role)) {
                return unauthorizedResponse();
            }
            if (jti == null || !refreshTokenStore.isActive(jti, rawRefreshToken)) {
                return unauthorizedResponse();
            }

            refreshTokenStore.revoke(jti);
            boolean rememberMe = Boolean.TRUE.equals(claims.get("rememberMe", Boolean.class));
            AdminProfileResponse admin = adminAuthService.getConfiguredAdmin();
            auditService.log(admin.getId(), admin.getEmail(), "admin.token.refresh", "admin",
                    String.valueOf(admin.getId()), Map.of("rememberMe", rememberMe));
            return buildAuthResponse(admin, rememberMe);
        } catch (Exception ignored) {
            return unauthorizedResponse();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest servletRequest
    ) {
        String rawRefreshToken = resolveRefreshToken(servletRequest, request);
        String revokedJti = null;
        String subject = null;
        if (rawRefreshToken != null) {
            try {
                Claims claims = jwtService.parseToken(rawRefreshToken);
                revokedJti = claims.getId();
                subject = claims.getSubject();
                refreshTokenStore.revoke(revokedJti);
            } catch (Exception ignored) {
            }
        }

        HashMap<String, Object> payload = new HashMap<>();
        payload.put("jti", revokedJti);
        payload.put("hadToken", rawRefreshToken != null);
        auditService.log(null, subject, "admin.logout", "admin", subject, payload);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.buildClearingCookie())
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.buildClearingAccessCookie())
                .body(Map.of("message", "Deconnecte"));
    }

    private ResponseEntity<AdminAuthResponse> buildAuthResponse(AdminProfileResponse admin, boolean rememberMe) {
        String accessToken = jwtService.generateAdminAccessToken(admin);
        RefreshTokenPayload refreshPayload = jwtService.generateAdminRefreshToken(admin, rememberMe);
        refreshTokenStore.store(refreshPayload.jti(), refreshPayload.token(), refreshPayload.expiresAt());

        long refreshMaxAgeSeconds = Math.max(1, Duration.between(Instant.now(), refreshPayload.expiresAt()).getSeconds());
        long accessTtlSeconds = jwtService.getAccessTokenTtlSeconds();

        // Sprint securite : access token pose en cookie HttpOnly (defense XSS).
        // On garde aussi le token dans le body pour les clients backend (tests, integrations
        // futures, scripts) qui ne peuvent pas / ne veulent pas s'appuyer sur les cookies.
        // Le frontend admin lui ne stocke plus le token, il s'appuie uniquement sur le cookie.
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.buildRefreshCookie(refreshPayload.token(), refreshMaxAgeSeconds))
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.buildAccessCookie(accessToken, accessTtlSeconds))
                .body(new AdminAuthResponse(
                        accessToken,
                        null,
                        accessTtlSeconds,
                        admin,
                        "ADMIN"
                ));
    }

    private ResponseEntity<AdminAuthResponse> unauthorizedResponse() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.buildClearingCookie())
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.buildClearingAccessCookie())
                .build();
    }

    private String resolveRefreshToken(HttpServletRequest request, RefreshTokenRequest body) {
        String cookieToken = refreshCookieService.resolveRefreshToken(request);
        if (cookieToken != null) {
            return cookieToken;
        }
        if (body == null || body.getRefreshToken() == null || body.getRefreshToken().isBlank()) {
            return null;
        }
        return body.getRefreshToken();
    }
}

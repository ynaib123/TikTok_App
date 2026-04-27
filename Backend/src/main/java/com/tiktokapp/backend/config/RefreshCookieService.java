package com.tiktokapp.backend.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class RefreshCookieService {

    private final SecurityProperties securityProperties;

    public RefreshCookieService(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    public String buildRefreshCookie(String refreshToken, long maxAgeSeconds) {
        return ResponseCookie.from(securityProperties.getRefreshCookieName(), refreshToken)
                .httpOnly(true)
                .secure(securityProperties.isSecureCookies())
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }

    public String buildClearingCookie() {
        return ResponseCookie.from(securityProperties.getRefreshCookieName(), "")
                .httpOnly(true)
                .secure(securityProperties.isSecureCookies())
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build()
                .toString();
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }

        for (Cookie cookie : request.getCookies()) {
            if (securityProperties.getRefreshCookieName().equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value == null || value.isBlank()) ? null : value;
            }
        }

        return null;
    }
}

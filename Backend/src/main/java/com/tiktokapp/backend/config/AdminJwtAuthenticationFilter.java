package com.tiktokapp.backend.config;

import com.tiktokapp.backend.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class AdminJwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final RefreshCookieService refreshCookieService;

    public AdminJwtAuthenticationFilter(JwtService jwtService, RefreshCookieService refreshCookieService) {
        this.jwtService = jwtService;
        this.refreshCookieService = refreshCookieService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String token = resolveAccessToken(request);
        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtService.parseAccessToken(token);
            String email = claims.getSubject();
            String role = claims.get("role", String.class);
            if (email != null && role != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ignored) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Lit l'access token : cookie HttpOnly d'abord (mode securise par defaut),
     * fallback sur l'en-tete {@code Authorization: Bearer ...} pour compat tests
     * et clients legacy.
     */
    private String resolveAccessToken(HttpServletRequest request) {
        String cookieToken = refreshCookieService.resolveAccessToken(request);
        if (cookieToken != null && !cookieToken.isBlank()) {
            return cookieToken;
        }
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        return authorizationHeader.substring(7).trim();
    }
}

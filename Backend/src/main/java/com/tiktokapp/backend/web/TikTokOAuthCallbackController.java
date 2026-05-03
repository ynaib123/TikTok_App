package com.tiktokapp.backend.web;

import com.tiktokapp.backend.config.SecurityProperties;
import com.tiktokapp.backend.service.videoops.TikTokOAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/tiktok-callback")
public class TikTokOAuthCallbackController {

    private final TikTokOAuthService tikTokOAuthService;
    private final SecurityProperties securityProperties;

    public TikTokOAuthCallbackController(
            TikTokOAuthService tikTokOAuthService,
            SecurityProperties securityProperties
    ) {
        this.tikTokOAuthService = tikTokOAuthService;
        this.securityProperties = securityProperties;
    }

    @GetMapping
    public ResponseEntity<Void> handleCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(name = "error_description", required = false) String errorDescription
    ) {
        String frontendBase = normalizeFrontendBase(securityProperties.getFrontendBaseUrl());

        if (error != null && !error.isBlank()) {
            String message = errorDescription != null && !errorDescription.isBlank() ? errorDescription : error;
            return redirectToCallbackPage(frontendBase, "error", message);
        }

        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            return redirectToCallbackPage(frontendBase, "error", "Parametres OAuth TikTok manquants.");
        }

        try {
            String redirectPath = tikTokOAuthService.completeAuthorizationFromServerCallback(code, state);
            String target = frontendBase + redirectPath + "?tiktokSuccess=1";
            return ResponseEntity.status(302).location(URI.create(target)).build();
        } catch (ResponseStatusException exception) {
            String message = exception.getReason() != null ? exception.getReason() : "Erreur OAuth TikTok.";
            return redirectToCallbackPage(frontendBase, "error", message);
        } catch (Exception exception) {
            return redirectToCallbackPage(frontendBase, "error", "Erreur inattendue lors de la connexion TikTok.");
        }
    }

    private ResponseEntity<Void> redirectToCallbackPage(String frontendBase, String param, String value) {
        String target = frontendBase + "/tiktok-callback?" + param + "=" + encode(value);
        return ResponseEntity.status(302).location(URI.create(target)).build();
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String normalizeFrontendBase(String url) {
        String normalized = url == null ? "" : url.trim().replaceAll("/+$", "");
        return normalized.isBlank() ? "http://localhost:5174" : normalized;
    }
}

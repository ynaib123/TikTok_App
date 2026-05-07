package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeRequest;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackRequest;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackResponse;
import com.tiktokapp.backend.service.videoops.TikTokOAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Phase 2.2 split — TikTok OAuth authorize/callback endpoints extracted
 * from VideoOpsController. URL paths are unchanged.
 */
@RestController
@RequestMapping("/api/video-ops/tiktok-oauth")
public class TikTokOAuthController {

    private final TikTokOAuthService tikTokOAuthService;

    public TikTokOAuthController(TikTokOAuthService tikTokOAuthService) {
        this.tikTokOAuthService = tikTokOAuthService;
    }

    @PostMapping("/authorize")
    public ResponseEntity<TikTokOAuthAuthorizeResponse> createTikTokAuthorizationUrl(
            @RequestBody(required = false) TikTokOAuthAuthorizeRequest request,
            Authentication authentication
    ) {
        String redirectPath = request == null ? null : request.getRedirectPath();
        return ResponseEntity.ok(tikTokOAuthService.createAuthorizationUrl(authentication.getName(), redirectPath));
    }

    @PostMapping("/callback")
    public ResponseEntity<TikTokOAuthCallbackResponse> completeTikTokAuthorization(
            @Valid @RequestBody TikTokOAuthCallbackRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(tikTokOAuthService.completeAuthorization(
                authentication.getName(),
                request.getCode(),
                request.getState()
        ));
    }
}

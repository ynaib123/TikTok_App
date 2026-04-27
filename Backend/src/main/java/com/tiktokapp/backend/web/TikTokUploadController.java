package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.TikTokUploadRequest;
import com.tiktokapp.backend.dto.TikTokUploadResponse;
import com.tiktokapp.backend.service.TikTokUploadService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tiktok")
public class TikTokUploadController {

    private final TikTokUploadService tikTokUploadService;

    public TikTokUploadController(TikTokUploadService tikTokUploadService) {
        this.tikTokUploadService = tikTokUploadService;
    }

    @PostMapping("/upload")
    public ResponseEntity<TikTokUploadResponse> upload(@Valid @RequestBody TikTokUploadRequest request) {
        TikTokUploadResponse response = tikTokUploadService.uploadFromShotstack(
                request.getShotstackUrl(),
                request.getUploadUrl()
        );
        return ResponseEntity.ok(response);
    }
}

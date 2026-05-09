package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.audio.AudioAssetResponse;
import com.tiktokapp.backend.dto.audio.GenerateVoiceRequest;
import com.tiktokapp.backend.dto.audio.VoiceCardResponse;
import com.tiktokapp.backend.service.audio.AudioService;
import io.micrometer.core.annotation.Timed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints powering the AudioStep of the TikTok journey (Lot 4 / Mission 4).
 *
 * <ul>
 *   <li>{@code GET  /api/audio/voices} — list available ElevenLabs voices (cached).</li>
 *   <li>{@code POST /api/audio/preview} — short TTS preview (≤240 chars), audio/mpeg stream.</li>
 *   <li>{@code POST /api/audio/generate} — full voice-over generation, persisted as an AudioAsset.</li>
 *   <li>{@code GET  /api/audio/assets/{contentIdeaId}} — list takes for a content idea.</li>
 *   <li>{@code POST /api/audio/assets/{assetId}/select} — flip an existing take to selected.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/audio")
public class AudioController {

    private final AudioService audioService;

    public AudioController(AudioService audioService) {
        this.audioService = audioService;
    }

    @GetMapping("/voices")
    @Timed(value = "tiktokapp.audio.voices", description = "ElevenLabs voice list latency")
    public ResponseEntity<List<VoiceCardResponse>> listVoices() {
        return ResponseEntity.ok(audioService.listVoices());
    }

    @PostMapping(value = "/preview", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @Timed(value = "tiktokapp.audio.preview", description = "ElevenLabs preview latency")
    public ResponseEntity<byte[]> previewVoice(
            @RequestParam @NotBlank @Size(max = 128) String voiceId,
            @RequestParam @NotBlank @Size(max = 240) String text
    ) {
        byte[] bytes = audioService.previewVoice(voiceId, text);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("audio/mpeg"));
        headers.setContentLength(bytes.length);
        headers.setCacheControl("no-store");
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @PostMapping("/generate")
    @Timed(value = "tiktokapp.audio.generate", description = "ElevenLabs full TTS + persistence latency")
    public ResponseEntity<AudioAssetResponse> generateVoice(
            @Valid @RequestBody GenerateVoiceRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(audioService.generateVoice(request, authentication.getName()));
    }

    @GetMapping("/assets/{contentIdeaId}")
    public ResponseEntity<List<AudioAssetResponse>> listAssets(@PathVariable long contentIdeaId) {
        return ResponseEntity.ok(audioService.listForIdea(contentIdeaId));
    }

    @PostMapping("/assets/{assetId}/select")
    public ResponseEntity<AudioAssetResponse> selectAsset(
            @PathVariable long assetId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(audioService.selectAsset(assetId, authentication.getName()));
    }
}

package com.tiktokapp.backend.web;

import com.tiktokapp.backend.dto.audio.ImportSoundRequest;
import com.tiktokapp.backend.dto.audio.ImportSoundResponse;
import com.tiktokapp.backend.dto.audio.TikTokSoundResponse;
import com.tiktokapp.backend.service.audio.TikTokSoundService;
import io.micrometer.core.annotation.Timed;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * TikTok native sounds library — used by the Audio step music tab.
 *
 * <ul>
 *   <li>{@code GET  /api/audio/tiktok-sounds} — list / search sounds by category or text query.</li>
 *   <li>{@code POST /api/audio/tiktok-sounds/import} — import a sound from a TikTok video URL.</li>
 * </ul>
 *
 * The {@code soundId} returned in each response is the value to pass to the
 * TikTok Content Posting API as {@code music_info.music_id} when publishing.
 */
@RestController
@RequestMapping("/api/audio/tiktok-sounds")
public class TikTokSoundController {

    private final TikTokSoundService soundService;

    public TikTokSoundController(TikTokSoundService soundService) {
        this.soundService = soundService;
    }

    /**
     * List sounds from the local DB.
     *
     * @param category  Category filter: {@code trending} (default), {@code pop},
     *                  {@code hip-hop}, {@code electronic}, {@code chill},
     *                  {@code motivation}, {@code imported} …
     * @param q         Optional text search on title / author (case-insensitive).
     * @param limit     Max results (capped at 100, default 40).
     */
    @GetMapping
    @Timed(value = "tiktokapp.tiktok_sounds.list", description = "TikTok sounds list latency")
    public ResponseEntity<List<TikTokSoundResponse>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "40") int limit
    ) {
        return ResponseEntity.ok(soundService.list(category, q, limit));
    }

    /**
     * Import a sound from a TikTok video URL.
     * Resolves the video via oEmbed and persists the extracted sound metadata.
     * Returns {@code alreadyExisted = true} when the sound_id was already in the DB.
     */
    @PostMapping("/import")
    @Timed(value = "tiktokapp.tiktok_sounds.import", description = "TikTok sound import latency")
    public ResponseEntity<ImportSoundResponse> importByUrl(
            @Valid @RequestBody ImportSoundRequest request
    ) {
        return ResponseEntity.ok(soundService.importByUrl(request.videoUrl()));
    }
}

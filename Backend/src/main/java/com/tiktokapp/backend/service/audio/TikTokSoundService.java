package com.tiktokapp.backend.service.audio;

import com.tiktokapp.backend.config.TikTokSoundProperties;
import com.tiktokapp.backend.dto.audio.ImportSoundResponse;
import com.tiktokapp.backend.dto.audio.TikTokSoundResponse;
import com.tiktokapp.backend.model.TikTokSound;
import com.tiktokapp.backend.repository.TikTokSoundRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Business logic for the TikTok native sounds library :
 *
 * <ul>
 *   <li>Lists / searches sounds stored in the DB.</li>
 *   <li>Imports a sound from a TikTok video URL (via oEmbed + optional Research API).</li>
 *   <li>Nightly refresh job (disabled by default) that pulls trending sounds via
 *       the TikTok Research API and upserts them in the DB.</li>
 * </ul>
 */
@Service
public class TikTokSoundService {

    private static final Logger logger = LoggerFactory.getLogger(TikTokSoundService.class);

    private final TikTokSoundRepository  soundRepository;
    private final TikTokSoundClient      soundClient;
    private final TikTokSoundProperties  properties;

    public TikTokSoundService(
            TikTokSoundRepository soundRepository,
            TikTokSoundClient     soundClient,
            TikTokSoundProperties properties
    ) {
        this.soundRepository = soundRepository;
        this.soundClient     = soundClient;
        this.properties      = properties;
    }

    // ── Query ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TikTokSoundResponse> list(String category, String q, int limit) {
        int cap = Math.min(limit, 100);
        PageRequest page = PageRequest.of(0, cap);

        if (q != null && !q.isBlank()) {
            return soundRepository.searchByQuery(q.trim(), page).stream()
                    .map(TikTokSoundResponse::from)
                    .toList();
        }

        if ("trending".equalsIgnoreCase(category) || category == null || category.isBlank()) {
            return soundRepository.findByTrendingTrueOrderByVideoCountDesc(page).stream()
                    .map(TikTokSoundResponse::from)
                    .toList();
        }

        return soundRepository.findByCategoryOrderByVideoCountDesc(category, page).stream()
                .map(TikTokSoundResponse::from)
                .toList();
    }

    // ── Import ───────────────────────────────────────────────────────────────

    /**
     * Imports a TikTok sound from a video URL :
     * <ol>
     *   <li>Calls oEmbed to get title, author, thumbnail.</li>
     *   <li>Derives {@code soundId} from the video ID embedded in the URL
     *       (TikTok video IDs are stable and accepted as music IDs in their API).</li>
     *   <li>Upserts the sound in the DB (returns the existing record if already imported).</li>
     * </ol>
     */
    @Transactional
    public ImportSoundResponse importByUrl(String videoUrl) {
        if (videoUrl == null || videoUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "videoUrl est obligatoire.");
        }

        // 1. Resolve via oEmbed
        TikTokSoundClient.OembedResult meta;
        try {
            meta = soundClient.resolveUrl(videoUrl);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Impossible de résoudre l'URL TikTok : " + ex.getMessage(), ex);
        }

        if (meta.videoId() == null || meta.videoId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Impossible d'extraire l'identifiant depuis l'URL : " + videoUrl);
        }

        // 2. Check if already in DB
        Optional<TikTokSound> existing = soundRepository.findBySoundId(meta.videoId());
        if (existing.isPresent()) {
            logger.info("tiktok_sound event=import_url_existing soundId={}", meta.videoId());
            return new ImportSoundResponse(TikTokSoundResponse.from(existing.get()), true);
        }

        // 3. Persist new sound
        TikTokSound sound = new TikTokSound();
        sound.setSoundId(meta.videoId());
        sound.setTitle(meta.title());
        sound.setAuthorName(meta.authorName());
        sound.setCoverUrl(meta.thumbnailUrl());
        sound.setSource(TikTokSound.Source.import_url.name());
        sound.setCategory("imported");
        TikTokSound saved = soundRepository.save(sound);

        logger.info("tiktok_sound event=import_url_new soundId={} title={}", saved.getSoundId(), saved.getTitle());
        return new ImportSoundResponse(TikTokSoundResponse.from(saved), false);
    }

    // ── Nightly refresh ──────────────────────────────────────────────────────

    /**
     * Nightly job (02:30 UTC) — fetches trending sounds from TikTok Research API
     * and upserts them in the DB.
     * Skipped silently when {@code app.tiktok-sounds.refresh-enabled=false} (default)
     * or when no Research API key is configured.
     */
    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public void refreshTrendingSounds() {
        if (!properties.isRefreshEnabled() || !properties.hasResearchApiKey()) {
            return;
        }
        logger.info("tiktok_sound event=refresh_start");

        List<TikTokSoundClient.ResearchSoundResult> results =
                soundClient.fetchTrendingSounds("FR", 80);

        // Also fetch EN region for broader coverage
        List<TikTokSoundClient.ResearchSoundResult> enResults =
                soundClient.fetchTrendingSounds("US", 40);

        int upserted = 0;
        for (TikTokSoundClient.ResearchSoundResult r : concat(results, enResults)) {
            upserted += upsertSound(r);
        }

        logger.info("tiktok_sound event=refresh_done total_upserted={}", upserted);
    }

    private int upsertSound(TikTokSoundClient.ResearchSoundResult r) {
        if (r.soundId() == null || r.soundId().isBlank()) return 0;
        try {
            Optional<TikTokSound> existing = soundRepository.findBySoundId(r.soundId());
            TikTokSound sound = existing.orElseGet(TikTokSound::new);
            sound.setSoundId(r.soundId());
            sound.setTitle(r.title().isBlank() ? "Son TikTok" : r.title());
            sound.setAuthorName(r.authorName());
            sound.setDurationMs(r.durationMs() > 0 ? r.durationMs() : null);
            sound.setCoverUrl(r.coverUrl());
            sound.setPlayUrl(r.playUrl());
            sound.setVideoCount(r.shareCount());
            sound.setTrending(true);
            sound.setSource(TikTokSound.Source.research_api.name());
            sound.setRefreshedAt(Instant.now());
            if (sound.getCategory() == null) sound.setCategory("trending");
            soundRepository.save(sound);
            return 1;
        } catch (Exception ex) {
            logger.warn("tiktok_sound upsert_failed soundId={} reason={}", r.soundId(), ex.getMessage());
            return 0;
        }
    }

    @SafeVarargs
    private static <T> List<T> concat(List<T>... lists) {
        return Arrays.stream(lists)
                .flatMap(List::stream)
                .toList();
    }
}

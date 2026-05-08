package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Récupère un clip Pexels portrait par scène (multi-clips).
 *
 * Pour limiter les coûts API et la latence :
 *  - cache par query au sein d'un batch (les scènes qui partagent la même query
 *    ne déclenchent qu'un seul appel),
 *  - budget dur de {@link #MAX_UNIQUE_QUERIES} requêtes uniques par batch.
 */
@Service
public class PexelsMultiSearchService {

    public static final int MAX_UNIQUE_QUERIES = 10;
    private static final int PER_PAGE = 8;

    private static final Logger logger = LoggerFactory.getLogger(PexelsMultiSearchService.class);

    private final VideoOpsInternalProxyService proxyService;

    public PexelsMultiSearchService(VideoOpsInternalProxyService proxyService) {
        this.proxyService = proxyService;
    }

    public record MediaPick(
            String query,
            String url,
            int width,
            int height,
            double durationSec,
            String provider
    ) {}

    /**
     * Pour chaque query (dans l'ordre), retourne le meilleur clip portrait disponible.
     * Les queries dupliquées partagent un seul appel API. Si Pexels ne renvoie aucun
     * portrait exploitable, on retombe sur la dernière pick réussie. Si AUCUNE query
     * ne produit de pick, retourne une liste vide.
     */
    public List<Optional<MediaPick>> fetchForQueries(List<String> queries) {
        if (queries == null || queries.isEmpty()) {
            return List.of();
        }
        long uniqueCount = queries.stream().filter(q -> q != null && !q.isBlank()).distinct().count();
        if (uniqueCount > MAX_UNIQUE_QUERIES) {
            throw new IllegalArgumentException(
                    "Trop de queries Pexels uniques (" + uniqueCount + " > " + MAX_UNIQUE_QUERIES + ")"
            );
        }

        Map<String, Optional<MediaPick>> cache = new HashMap<>();
        List<Optional<MediaPick>> result = new ArrayList<>(queries.size());
        Optional<MediaPick> lastSuccessful = Optional.empty();

        for (String rawQuery : queries) {
            String query = rawQuery == null ? "" : rawQuery.trim();
            if (query.isEmpty()) {
                result.add(lastSuccessful);
                continue;
            }
            Optional<MediaPick> pick = cache.computeIfAbsent(query, this::searchAndPick);
            if (pick.isPresent()) {
                lastSuccessful = pick;
                result.add(pick);
            } else {
                result.add(lastSuccessful);
            }
        }
        return result;
    }

    private Optional<MediaPick> searchAndPick(String query) {
        JsonNode response;
        try {
            response = proxyService.proxyPexelsVideoSearch(query, PER_PAGE, "portrait");
        } catch (RuntimeException ex) {
            logger.warn("Pexels search failed for query '{}': {}", query, ex.getMessage());
            return Optional.empty();
        }
        return selectBestPortrait(response, query);
    }

    Optional<MediaPick> selectBestPortrait(JsonNode response, String query) {
        if (response == null) return Optional.empty();
        JsonNode videos = response.path("videos");
        if (!videos.isArray() || videos.isEmpty()) return Optional.empty();

        MediaPick best = null;
        int bestScore = Integer.MIN_VALUE;
        for (JsonNode video : videos) {
            JsonNode files = video.path("video_files");
            if (!files.isArray()) continue;
            double clipDuration = video.path("duration").asDouble(0);
            for (JsonNode file : files) {
                if (!"video/mp4".equalsIgnoreCase(file.path("file_type").asText(""))) continue;
                int w = file.path("width").asInt(0);
                int h = file.path("height").asInt(0);
                if (w <= 0 || h <= 0 || w > h) continue; // portrait only
                String url = file.path("link").asText(null);
                if (url == null || url.isBlank()) continue;

                int score = scoreFile(w, h);
                if (score > bestScore) {
                    bestScore = score;
                    best = new MediaPick(query, url, w, h, clipDuration, "pexels");
                }
            }
        }
        return Optional.ofNullable(best);
    }

    /**
     * Score : pénalise la distance à 1080 de large (résolution TikTok native), avec
     * un bonus pour le ratio 1080×1920 exact. Plus le score est haut, mieux c'est.
     */
    private int scoreFile(int width, int height) {
        int distancePenalty = Math.abs(width - 1080);
        int exactRatioBonus = (width == 1080 && height == 1920) ? 100 : 0;
        return 1000 - distancePenalty + exactRatioBonus;
    }
}

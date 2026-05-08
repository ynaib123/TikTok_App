package com.tiktokapp.backend.service.videoops;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Découpe un script en scènes prêtes pour le contrat render-video 1.1.0.
 *
 * V1 déterministe : split par phrases, durée pondérée par longueur du texte,
 * media query par scène construite à partir du keyword global enrichi du mot
 * saillant local. Aucun I/O, aucun appel LLM — tout est testable unitairement.
 */
@Service
public class SceneBuilderService {

    public static final int MIN_SCENES = 2;
    public static final int MAX_SCENES = 10;
    public static final double MIN_SCENE_SEC = 3.0;
    public static final double MAX_SCENE_SEC = 60.0;

    private static final Pattern SENTENCE_BOUNDARY = Pattern.compile("[.!?\\n]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern WORD = Pattern.compile("[\\p{L}']{3,}");

    private static final Set<String> STOPWORDS_FR = Set.of(
            "alors", "ainsi", "apres", "aussi", "autre", "avant", "avec", "bien", "cela", "cette",
            "comme", "dans", "donc", "elle", "elles", "encore", "entre", "etre", "faire", "fait",
            "fois", "homme", "ici", "jamais", "leur", "leurs", "mais", "meme", "moins", "nous",
            "parce", "pour", "pourquoi", "quand", "quelque", "quoi", "sans", "sera", "serait",
            "sont", "sous", "suis", "tous", "tout", "toute", "trois", "tres", "vais", "vers",
            "voici", "voila", "votre", "vous", "deja", "celui", "celle", "ceux", "rien", "tant",
            "the", "and", "for", "but", "with", "this", "that", "from", "your");

    public record SceneSpec(int index, double durationSec, String text, String emotion, String mediaQuery) {}

    public List<SceneSpec> build(String script, String keyword, String category, double targetDurationSec) {
        List<String> rawLines = splitSentences(script);
        if (rawLines.isEmpty()) {
            return List.of();
        }

        List<String> lines = capScenes(rawLines);
        List<Double> rawDurations = weightedDurations(lines, targetDurationSec);
        List<Double> durations = clampAndRebalance(rawDurations, targetDurationSec);

        String safeKeyword = normalizeKeyword(keyword);
        String safeCategory = normalizeKeyword(category);

        List<SceneSpec> scenes = new ArrayList<>(lines.size());
        for (int i = 0; i < lines.size(); i++) {
            String text = lines.get(i);
            String dominant = extractDominantWord(text);
            String mediaQuery = buildMediaQuery(safeKeyword, safeCategory, dominant);
            String emotion = inferEmotion(i, lines.size());
            scenes.add(new SceneSpec(i, round1(durations.get(i)), text, emotion, mediaQuery));
        }
        return scenes;
    }

    private List<String> splitSentences(String script) {
        if (script == null || script.isBlank()) {
            return List.of();
        }
        String[] parts = SENTENCE_BOUNDARY.split(script);
        List<String> result = new ArrayList<>(parts.length);
        for (String part : parts) {
            String cleaned = WHITESPACE.matcher(part).replaceAll(" ").trim();
            if (cleaned.length() >= 3) {
                result.add(cleaned);
            }
        }
        return result;
    }

    private List<String> capScenes(List<String> lines) {
        if (lines.size() <= MAX_SCENES) {
            return lines;
        }
        // Garde les MAX_SCENES premières — un script TikTok bien écrit a son punch dans les 6 premières phrases.
        return new ArrayList<>(lines.subList(0, MAX_SCENES));
    }

    private List<Double> weightedDurations(List<String> lines, double totalSec) {
        double totalChars = 0;
        for (String line : lines) {
            totalChars += line.length();
        }
        List<Double> result = new ArrayList<>(lines.size());
        if (totalChars <= 0) {
            double even = totalSec / lines.size();
            for (int i = 0; i < lines.size(); i++) result.add(even);
            return result;
        }
        for (String line : lines) {
            result.add((line.length() / totalChars) * totalSec);
        }
        return result;
    }

    private List<Double> clampAndRebalance(List<Double> durations, double totalSec) {
        // Étape 1: clamp chaque scène entre MIN et MAX.
        List<Double> clamped = new ArrayList<>(durations.size());
        for (Double d : durations) {
            clamped.add(Math.max(MIN_SCENE_SEC, Math.min(MAX_SCENE_SEC, d)));
        }
        // Étape 2: rééquilibrage simple — calcule l'erreur totale et redistribue
        // proportionnellement aux marges disponibles dans chaque scène.
        double sum = clamped.stream().mapToDouble(Double::doubleValue).sum();
        double error = totalSec - sum;
        if (Math.abs(error) < 0.01) {
            return clamped;
        }
        boolean addingTime = error > 0;
        double redistributed = 0;
        for (int i = 0; i < clamped.size() && Math.abs(error - redistributed) > 0.01; i++) {
            double current = clamped.get(i);
            double slack = addingTime ? (MAX_SCENE_SEC - current) : (current - MIN_SCENE_SEC);
            if (slack <= 0) continue;
            double delta = Math.min(slack, Math.abs(error - redistributed));
            clamped.set(i, addingTime ? current + delta : current - delta);
            redistributed += addingTime ? delta : -delta;
        }
        return clamped;
    }

    private String normalizeKeyword(String value) {
        if (value == null) return "";
        return WHITESPACE.matcher(value).replaceAll(" ").trim().toLowerCase(Locale.ROOT);
    }

    private String extractDominantWord(String text) {
        if (text == null || text.isBlank()) return "";
        String lower = text.toLowerCase(Locale.ROOT);
        var matcher = WORD.matcher(lower);
        String best = "";
        while (matcher.find()) {
            String word = matcher.group();
            if (STOPWORDS_FR.contains(word)) continue;
            if (word.length() > best.length()) {
                best = word;
            }
        }
        return best;
    }

    private String buildMediaQuery(String keyword, String category, String dominant) {
        // Priorité : "<keyword> <dominantWord>" si on a les deux,
        // sinon keyword seul, sinon category seul, sinon "professional".
        boolean hasKeyword = !keyword.isEmpty();
        boolean hasDominant = !dominant.isEmpty() && !dominant.equalsIgnoreCase(keyword);
        if (hasKeyword && hasDominant) {
            return keyword + " " + dominant;
        }
        if (hasKeyword) return keyword;
        if (!category.isEmpty()) return category;
        return "professional";
    }

    private String inferEmotion(int index, int total) {
        if (total <= 1) return "reveal";
        if (index == 0) return "urgent";
        if (index == total - 1) return "finale";
        if (index == 1) return "reveal";
        return "energetic";
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}

package com.tiktokapp.backend.service.videoops;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SceneBuilderServiceTest {

    private final SceneBuilderService service = new SceneBuilderService();

    @Test
    void splitsSimpleScriptIntoScenes() {
        List<SceneBuilderService.SceneSpec> scenes = service.build(
                "Voici trois leviers. Le premier change tout. Le deuxieme te fait gagner. Le troisieme verrouille.",
                "business",
                "business",
                12.0
        );
        assertEquals(4, scenes.size());
        assertEquals(0, scenes.get(0).index());
        assertEquals("Voici trois leviers", scenes.get(0).text());
        assertEquals("Le troisieme verrouille", scenes.get(3).text());
    }

    @Test
    void clampsTotalDurationToTarget() {
        List<SceneBuilderService.SceneSpec> scenes = service.build(
                "Phrase une. Phrase deux. Phrase trois. Phrase quatre.",
                "fitness",
                "fitness",
                12.0
        );
        double total = scenes.stream().mapToDouble(SceneBuilderService.SceneSpec::durationSec).sum();
        // tolérance 0.4s liée aux arrondis à 0.1
        assertTrue(Math.abs(total - 12.0) <= 0.4, "total=" + total);
    }

    @Test
    void respectsMinAndMaxPerScene() {
        List<SceneBuilderService.SceneSpec> scenes = service.build(
                "Hi. Vraiment ce levier va changer ta façon de vendre completement et durablement.",
                "business",
                "business",
                12.0
        );
        for (SceneBuilderService.SceneSpec s : scenes) {
            assertTrue(s.durationSec() >= SceneBuilderService.MIN_SCENE_SEC,
                    "scene " + s.index() + " too short: " + s.durationSec());
            assertTrue(s.durationSec() <= SceneBuilderService.MAX_SCENE_SEC,
                    "scene " + s.index() + " too long: " + s.durationSec());
        }
    }

    @Test
    void capsAtMaxScenes() {
        // 12 phrases → cap à MAX_SCENES (10)
        String script = "Une. Deux. Trois. Quatre. Cinq. Six. Sept. Huit. Neuf. Dix. Onze. Douze.";
        List<SceneBuilderService.SceneSpec> scenes = service.build(script, "tech", "tech", 30.0);
        assertEquals(SceneBuilderService.MAX_SCENES, scenes.size());
    }

    @Test
    void returnsEmptyListWhenScriptIsBlank() {
        assertTrue(service.build(null, "x", "x", 12.0).isEmpty());
        assertTrue(service.build("   ", "x", "x", 12.0).isEmpty());
    }

    @Test
    void mediaQueryCombinesKeywordAndDominantWord() {
        List<SceneBuilderService.SceneSpec> scenes = service.build(
                "Voici trois leviers entrepreneuriaux. Le premier transforme ton business modele.",
                "business",
                "business",
                10.0
        );
        // Premier scène : "trois leviers entrepreneuriaux" → dominant ≠ stopword → mediaQuery doit contenir keyword + dominant
        SceneBuilderService.SceneSpec first = scenes.get(0);
        assertTrue(first.mediaQuery().startsWith("business "),
                "expected query to start with 'business ', got: " + first.mediaQuery());
        assertFalse(first.mediaQuery().equals("business"),
                "expected enrichment from sentence, got plain keyword");
    }

    @Test
    void mediaQueryFallsBackToKeywordWhenNoDominantWord() {
        // Phrases composées uniquement de stopwords → query = keyword seul
        List<SceneBuilderService.SceneSpec> scenes = service.build(
                "Tout pour vous. Aussi avec nous. Ainsi donc voila.",
                "fitness",
                "fitness",
                9.0
        );
        for (SceneBuilderService.SceneSpec s : scenes) {
            assertEquals("fitness", s.mediaQuery(),
                    "expected fallback to plain keyword for stopword-only sentence: " + s.text());
        }
    }

    @Test
    void emotionFollowsPositionalHeuristic() {
        List<SceneBuilderService.SceneSpec> scenes = service.build(
                "Aaa. Bbb. Ccc. Ddd.",
                "business",
                "business",
                10.0
        );
        assertEquals(4, scenes.size());
        assertAll(
                () -> assertEquals("urgent", scenes.get(0).emotion()),
                () -> assertEquals("reveal", scenes.get(1).emotion()),
                () -> assertEquals("energetic", scenes.get(2).emotion()),
                () -> assertEquals("finale", scenes.get(3).emotion())
        );
    }
}

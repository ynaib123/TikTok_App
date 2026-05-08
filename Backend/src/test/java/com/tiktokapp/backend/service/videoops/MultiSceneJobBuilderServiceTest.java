package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.model.ContentIdea;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MultiSceneJobBuilderServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private VideoOpsInternalProxyService proxyService;

    private MultiSceneJobBuilderService service;

    @BeforeEach
    void setUp() {
        service = new MultiSceneJobBuilderService(
                new SceneBuilderService(),
                new PexelsMultiSearchService(proxyService),
                objectMapper
        );
    }

    @Test
    void buildsContract110JobWithScenesArray() throws Exception {
        ContentIdea idea = new ContentIdea();
        idea.setId(42L);
        idea.setCategory("business");
        idea.setTopic("Trois leviers business");
        idea.setBackgroundKeyword("business");
        idea.setCaption("Business caption");
        idea.setScripts("Voici trois leviers entrepreneuriaux. Le premier transforme tout. Le deuxieme accelere. Le troisieme verrouille.");

        JsonNode pexelsResponse = objectMapper.readTree("""
                {
                  "videos": [{
                    "id": 1, "duration": 10,
                    "video_files": [{"link": "https://pexels/1080.mp4", "width": 1080, "height": 1920, "file_type": "video/mp4"}]
                  }]
                }
                """);
        when(proxyService.proxyPexelsVideoSearch(any(), anyInt(), any())).thenReturn(pexelsResponse);

        MultiSceneJobBuilderService.BuildOptions options = MultiSceneJobBuilderService.BuildOptions.defaults(123L, "test");
        MultiSceneJobBuilderService.BuildResult result = service.build(idea, options);

        ObjectNode job = result.renderJob();
        assertAll(
                () -> assertEquals("1.1.0", job.get("contractVersion").asText()),
                () -> assertEquals(123L, job.get("workflowRunId").asLong()),
                () -> assertEquals(42L, job.get("contentIdeaId").asLong()),
                () -> assertEquals("timed-scenes", job.get("render").get("sceneStrategy").asText()),
                () -> assertEquals("tiktok-scene-sequence", job.get("render").get("templateId").asText()),
                () -> assertEquals(4, job.get("assets").get("scenes").size()),
                () -> assertTrue(job.get("assets").get("backgroundVideo").has("url")),
                () -> assertEquals("https://pexels/1080.mp4",
                        job.get("assets").get("scenes").get(0).get("media").get("url").asText())
        );
    }

    @Test
    void scenesContainTextEmotionAndMediaQuery() throws Exception {
        ContentIdea idea = new ContentIdea();
        idea.setId(7L);
        idea.setCategory("fitness");
        idea.setBackgroundKeyword("fitness");
        idea.setScripts("Premier point. Second point. Dernier point.");

        JsonNode pexelsResponse = objectMapper.readTree("""
                {
                  "videos": [{
                    "id": 1,
                    "video_files": [{"link": "https://pexels/clip.mp4", "width": 1080, "height": 1920, "file_type": "video/mp4"}]
                  }]
                }
                """);
        when(proxyService.proxyPexelsVideoSearch(any(), anyInt(), any())).thenReturn(pexelsResponse);

        MultiSceneJobBuilderService.BuildResult result = service.build(idea, MultiSceneJobBuilderService.BuildOptions.defaults(0L, "test"));
        JsonNode firstScene = result.renderJob().get("assets").get("scenes").get(0);

        assertAll(
                () -> assertEquals(0, firstScene.get("index").asInt()),
                () -> assertEquals("Premier point", firstScene.get("text").asText()),
                () -> assertEquals("urgent", firstScene.get("emotion").asText()),
                () -> assertTrue(firstScene.get("mediaQuery").asText().startsWith("fitness")),
                () -> assertTrue(firstScene.get("durationSec").asDouble() >= SceneBuilderService.MIN_SCENE_SEC)
        );
    }

    @Test
    void prefersPlannedScenesWhenAvailable() throws Exception {
        ContentIdea idea = new ContentIdea();
        idea.setId(9L);
        idea.setCategory("food");
        idea.setBackgroundKeyword("fallback");
        idea.setScripts("Script fallback. Deuxieme fallback.");
        idea.setPlannedScenes("""
                [
                  {"sceneText":"Scene planifiee un","visualKeyword":"chef pasta","cameraMood":"macro food","overlayPriority":"hook"},
                  {"sceneText":"Scene planifiee deux","visualKeyword":"plate reveal","cameraMood":"top shot","overlayPriority":"body"}
                ]
                """);

        JsonNode pexelsResponse = objectMapper.readTree("""
                {
                  "videos": [{
                    "id": 1,
                    "video_files": [{"link": "https://pexels/planned.mp4", "width": 1080, "height": 1920, "file_type": "video/mp4"}]
                  }]
                }
                """);
        when(proxyService.proxyPexelsVideoSearch(any(), anyInt(), any())).thenReturn(pexelsResponse);

        MultiSceneJobBuilderService.BuildResult result = service.build(idea, MultiSceneJobBuilderService.BuildOptions.defaults(0L, "test"));
        JsonNode firstScene = result.renderJob().get("assets").get("scenes").get(0);

        assertAll(
                () -> assertEquals(2, result.renderJob().get("assets").get("scenes").size()),
                () -> assertEquals("Scene planifiee un", firstScene.get("text").asText()),
                () -> assertEquals("chef pasta", firstScene.get("mediaQuery").asText()),
                () -> assertEquals("macro food", firstScene.get("cameraMood").asText()),
                () -> assertEquals("hook", firstScene.get("overlayPriority").asText())
        );
    }

    @Test
    void throwsWhenScriptIsBlank() {
        ContentIdea idea = new ContentIdea();
        idea.setScripts("");
        idea.setBackgroundKeyword("x");
        assertThrows(IllegalStateException.class,
                () -> service.build(idea, MultiSceneJobBuilderService.BuildOptions.defaults(0L, "test")));
    }

    @Test
    void throwsWhenAllPexelsQueriesFail() throws Exception {
        ContentIdea idea = new ContentIdea();
        idea.setId(1L);
        idea.setBackgroundKeyword("nope");
        idea.setScripts("Phrase un. Phrase deux.");
        JsonNode emptyResponse = objectMapper.readTree("{\"videos\": []}");
        when(proxyService.proxyPexelsVideoSearch(any(), anyInt(), any())).thenReturn(emptyResponse);

        assertThrows(IllegalStateException.class,
                () -> service.build(idea, MultiSceneJobBuilderService.BuildOptions.defaults(0L, "test")));
    }
}

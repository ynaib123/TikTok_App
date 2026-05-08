package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PexelsMultiSearchServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private VideoOpsInternalProxyService proxyService;

    private PexelsMultiSearchService service;

    @BeforeEach
    void setUp() {
        service = new PexelsMultiSearchService(proxyService);
    }

    @Test
    void picksBest1080PortraitFromResponse() throws Exception {
        JsonNode response = objectMapper.readTree("""
                {
                  "videos": [
                    {
                      "id": 1,
                      "duration": 12,
                      "video_files": [
                        {"link": "https://x/720.mp4", "width": 720, "height": 1280, "file_type": "video/mp4"},
                        {"link": "https://x/1080.mp4", "width": 1080, "height": 1920, "file_type": "video/mp4"},
                        {"link": "https://x/2160.mp4", "width": 2160, "height": 3840, "file_type": "video/mp4"}
                      ]
                    }
                  ]
                }
                """);
        Optional<PexelsMultiSearchService.MediaPick> pick = service.selectBestPortrait(response, "business");
        assertTrue(pick.isPresent());
        assertEquals("https://x/1080.mp4", pick.get().url());
        assertEquals(1080, pick.get().width());
        assertEquals(1920, pick.get().height());
        assertEquals("pexels", pick.get().provider());
    }

    @Test
    void rejectsLandscapeFiles() throws Exception {
        JsonNode response = objectMapper.readTree("""
                {
                  "videos": [
                    {
                      "id": 1,
                      "video_files": [
                        {"link": "https://x/landscape.mp4", "width": 1920, "height": 1080, "file_type": "video/mp4"}
                      ]
                    }
                  ]
                }
                """);
        assertTrue(service.selectBestPortrait(response, "any").isEmpty());
    }

    @Test
    void returnsEmptyWhenNoVideos() throws Exception {
        JsonNode response = objectMapper.readTree("{\"videos\": []}");
        assertTrue(service.selectBestPortrait(response, "any").isEmpty());
    }

    @Test
    void deduplicatesQueriesViaCache() throws Exception {
        JsonNode response = objectMapper.readTree("""
                {
                  "videos": [{
                    "id": 1, "duration": 10,
                    "video_files": [{"link": "https://x/biz.mp4", "width": 1080, "height": 1920, "file_type": "video/mp4"}]
                  }]
                }
                """);
        when(proxyService.proxyPexelsVideoSearch(eq("business"), anyInt(), any())).thenReturn(response);
        when(proxyService.proxyPexelsVideoSearch(eq("fitness"), anyInt(), any())).thenReturn(response);

        List<Optional<PexelsMultiSearchService.MediaPick>> picks = service.fetchForQueries(
                List.of("business", "business", "fitness", "business")
        );

        assertEquals(4, picks.size());
        assertTrue(picks.stream().allMatch(Optional::isPresent));
        // 2 queries uniques → 2 appels API
        verify(proxyService, times(1)).proxyPexelsVideoSearch(eq("business"), anyInt(), any());
        verify(proxyService, times(1)).proxyPexelsVideoSearch(eq("fitness"), anyInt(), any());
    }

    @Test
    void fallsBackToLastSuccessfulPickWhenQueryFails() throws Exception {
        JsonNode goodResponse = objectMapper.readTree("""
                {
                  "videos": [{
                    "id": 1, "duration": 10,
                    "video_files": [{"link": "https://x/good.mp4", "width": 1080, "height": 1920, "file_type": "video/mp4"}]
                  }]
                }
                """);
        JsonNode emptyResponse = objectMapper.readTree("{\"videos\": []}");

        when(proxyService.proxyPexelsVideoSearch(eq("ok"), anyInt(), any())).thenReturn(goodResponse);
        when(proxyService.proxyPexelsVideoSearch(eq("nope"), anyInt(), any())).thenReturn(emptyResponse);

        List<Optional<PexelsMultiSearchService.MediaPick>> picks = service.fetchForQueries(List.of("ok", "nope", "nope"));

        assertAll(
                () -> assertEquals(3, picks.size()),
                () -> assertTrue(picks.get(0).isPresent()),
                () -> assertTrue(picks.get(1).isPresent(), "fallback to last good"),
                () -> assertEquals("https://x/good.mp4", picks.get(1).get().url()),
                () -> assertEquals("https://x/good.mp4", picks.get(2).get().url())
        );
    }

    @Test
    void firstQueryFailureLeavesEmptyOptional() throws Exception {
        JsonNode emptyResponse = objectMapper.readTree("{\"videos\": []}");
        when(proxyService.proxyPexelsVideoSearch(eq("nope"), anyInt(), any())).thenReturn(emptyResponse);

        List<Optional<PexelsMultiSearchService.MediaPick>> picks = service.fetchForQueries(List.of("nope"));
        assertEquals(1, picks.size());
        assertFalse(picks.get(0).isPresent());
    }

    @Test
    void rejectsTooManyUniqueQueries() {
        List<String> queries = List.of("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"); // 11 > MAX_UNIQUE_QUERIES=10
        assertThrows(IllegalArgumentException.class, () -> service.fetchForQueries(queries));
    }

    @Test
    void emptyQueriesReturnsEmptyList() {
        assertTrue(service.fetchForQueries(List.of()).isEmpty());
        assertTrue(service.fetchForQueries(null).isEmpty());
    }
}

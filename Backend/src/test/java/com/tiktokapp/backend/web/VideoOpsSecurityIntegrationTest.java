package com.tiktokapp.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tiktokapp;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.admin-email=admin@tiktokapp.local",
        "app.security.admin-password=admin123",
        "app.security.admin-name=Video Ops Admin",
        "app.security.jwt-secret=integration-test-secret-12345678901234567890",
        "app.security.secure-cookies=false",
        "app.security.bootstrap-admin-on-startup=true"
})
@AutoConfigureMockMvc
class VideoOpsSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VideoOpsService videoOpsService;

    private String accessToken;
    private Cookie csrfCookie;
    private String csrfHeaderName;
    private String csrfToken;

    @BeforeEach
    void setUp() throws Exception {
        when(videoOpsService.fetchContentIdeas()).thenReturn(List.of(
                new VideoContentIdeaResponse(
                        42L,
                        "Fitness",
                        "Idea",
                        "Script",
                        "Caption",
                        "Keyword",
                        "done",
                        "draft",
                        "ready",
                        "https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/video.mp4",
                        "",
                        "open-id-demo",
                        "render_ready",
                        null
                )
        ));
        when(videoOpsService.triggerCheckShotstack(any(), eq("admin@tiktokapp.local"))).thenReturn(
                new VideoWorkflowActionResponse(7L, 42L, "CHECK_SHOTSTACK", "ACCEPTED", "ok", false)
        );
        when(videoOpsService.completeWorkflowRun(eq(99L), any())).thenReturn(
                new VideoWorkflowRunDetailResponse(
                        99L,
                        42L,
                        "INIT_PUBLISH_TIKTOK",
                        "SUCCEEDED",
                        1,
                        null,
                        "{}",
                        "2026-04-29T00:00:00Z",
                        "2026-04-29T00:00:02Z"
                )
        );

        MvcResult csrfResult = mockMvc.perform(get("/api/admins/csrf-token"))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> csrfPayload = objectMapper.readValue(csrfResult.getResponse().getContentAsString(), Map.class);
        csrfHeaderName = String.valueOf(csrfPayload.get("headerName"));
        csrfToken = String.valueOf(csrfPayload.get("token"));
        csrfCookie = csrfResult.getResponse().getCookie("XSRF-TOKEN");

        MvcResult loginResult = mockMvc.perform(post("/api/admins/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@tiktokapp.local\",\"motDePasse\":\"admin123\",\"rememberMe\":true}")
                        .cookie(csrfCookie)
                        .header(csrfHeaderName, csrfToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString()).path("token").asText();
    }

    @Test
    void blocksAnonymousRequestsOnProtectedVideoOpsRoutes() throws Exception {
        mockMvc.perform(get("/api/video-ops/content-ideas"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void allowsAuthenticatedAdminToReadProtectedVideoOpsRoutes() throws Exception {
        mockMvc.perform(get("/api/video-ops/content-ideas")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(42));

        verify(videoOpsService).fetchContentIdeas();
    }

    @Test
    void requiresCsrfForProtectedPostRoutes() throws Exception {
        mockMvc.perform(post("/api/video-ops/workflows/check-shotstack")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentIdeaId\":42,\"topic\":\"Idea\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void allowsProtectedPostRoutesWithAuthAndCsrf() throws Exception {
        mockMvc.perform(post("/api/video-ops/workflows/check-shotstack")
                        .header("Authorization", "Bearer " + accessToken)
                        .header(csrfHeaderName, csrfToken)
                        .cookie(csrfCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentIdeaId\":42,\"topic\":\"Idea\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(7))
                .andExpect(jsonPath("$.workflowType").value("CHECK_SHOTSTACK"));

        verify(videoOpsService).triggerCheckShotstack(any(), eq("admin@tiktokapp.local"));
    }

    @Test
    void acceptsWorkflowCompletionCallbackWithLegacySecretHeader() throws Exception {
        mockMvc.perform(post("/api/video-ops/workflow-runs/99/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Callback-Secret", "video-ops-callback-123")
                        .content("""
                                {"status":"SUCCEEDED","message":"Workflow termine"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"));

        verify(videoOpsService).validateWorkflowCallbackRequest(
                eq("POST"),
                eq("/api/video-ops/workflow-runs/99/complete"),
                anyString(),
                eq(null),
                eq(null),
                eq("video-ops-callback-123")
        );
        verify(videoOpsService).completeWorkflowRun(eq(99L), any(VideoWorkflowRunCompletionRequest.class));
    }
}

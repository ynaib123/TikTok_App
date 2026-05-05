package com.tiktokapp.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.AccountsOverviewResponse;
import com.tiktokapp.backend.dto.videoops.AccountsReadinessResponse;
import com.tiktokapp.backend.dto.videoops.PexelsVideoSearchRequest;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionResponse;
import com.tiktokapp.backend.dto.videoops.VideoContentIdeaResponse;
import com.tiktokapp.backend.dto.videoops.N8nWorkflowContractResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountContextResponse;
import com.tiktokapp.backend.dto.videoops.TikTokInitPublishContextResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoPipelineEventResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.service.videoops.AccountsService;
import com.tiktokapp.backend.service.videoops.TikTokInternalAccountContextService;
import com.tiktokapp.backend.service.videoops.TikTokInitPublishContextService;
import com.tiktokapp.backend.service.videoops.VideoOpsDataService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalProxyService;
import com.tiktokapp.backend.service.videoops.VideoOpsService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
        "app.security.bootstrap-admin-on-startup=true",
        "app.video-ops.internal-api-secret=internal-test-secret",
        "app.video-ops.allow-legacy-workflow-callback-secret=true"
})
@AutoConfigureMockMvc
class VideoOpsSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VideoOpsService videoOpsService;

    @MockBean
    private AccountsService accountsService;

    @MockBean
    private TikTokInitPublishContextService tikTokInitPublishContextService;

    @MockBean
    private TikTokInternalAccountContextService tikTokInternalAccountContextService;

    @MockBean
    private VideoOpsInternalProxyService videoOpsInternalProxyService;

    @MockBean
    private VideoOpsDataService videoOpsDataService;

    private String accessToken;
    private Cookie csrfCookie;
    private String csrfHeaderName;
    private String csrfToken;

    @BeforeEach
    void setUp() throws Exception {
        when(videoOpsService.fetchContentIdeas(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(
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
        )));
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
        when(videoOpsService.fetchObservability()).thenReturn(
                new VideoObservabilityResponse(
                        List.of(new VideoWorkflowRunDetailResponse(99L, 42L, "INIT_PUBLISH_TIKTOK", "SUCCEEDED", 1, null, "{}", "2026-04-29T00:00:00Z", "2026-04-29T00:00:02Z")),
                        List.of(),
                        List.of(new VideoPipelineEventResponse(42L, 99L, "ERROR", "workflow_failed", "boom", "2026-04-29T00:00:03Z")),
                        List.of(),
                        new N8nWorkflowContractResponse(
                                true,
                                "service_connection",
                                "http://n8n:5678",
                                Map.of("mainPipeline", "/webhook/fused-idea-script"),
                                List.of(),
                                false,
                                0
                        )
                )
        );
        when(accountsService.fetchOverview()).thenReturn(
                new AccountsOverviewResponse(
                        List.of(new com.tiktokapp.backend.dto.videoops.TikTokAccountResponse(1L, "Demo", "open-id-demo", "video.publish", "production", "connected")),
                        List.of(new ServiceConnectionResponse(10L, "GROQ", "Groq Prod", "https://api.groq.com", "team@groq.local", "{\"model\":\"llama\"}", true, "CONNECTED", true, "VALID", "Groq a repondu 200.", "2026-04-29T00:00:00Z", "2026-04-29T00:01:00Z", "2026-04-29T00:01:00Z", null, null)),
                        new AccountsReadinessResponse(true, 1, List.of())
                )
        );
        when(accountsService.fetchReadiness()).thenReturn(
                new AccountsReadinessResponse(false, 1, List.of("Shotstack"))
        );
        when(tikTokInitPublishContextService.buildContext(any())).thenReturn(
                new TikTokInitPublishContextResponse(
                        42L,
                        "open-id-demo",
                        "access-token-demo",
                        "Bearer",
                        "Caption",
                        "https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/video.mp4",
                        List.of("SELF_ONLY"),
                        "SELF_ONLY"
                )
        );
        when(tikTokInternalAccountContextService.buildContext(any())).thenReturn(
                new TikTokAccountContextResponse(
                        "open-id-demo",
                        "access-token-demo",
                        "Bearer",
                        "video.publish",
                        List.of("SELF_ONLY"),
                        "SELF_ONLY"
                )
        );
        when(videoOpsInternalProxyService.proxyGroqChatCompletions(any())).thenReturn(
                objectMapper.readTree("""
                        {"choices":[{"message":{"content":"ok"}}]}
                        """)
        );
        when(videoOpsInternalProxyService.proxyPexelsVideoSearch(anyString(), any(), anyString())).thenReturn(
                objectMapper.readTree("""
                        {"videos":[{"id":1}]}
                        """)
        );
        when(videoOpsInternalProxyService.proxyShotstackRender(any())).thenReturn(
                objectMapper.readTree("""
                        {"response":{"id":"render-demo"}}
                        """)
        );
        when(videoOpsInternalProxyService.proxyShotstackRenderStatus(eq("render-demo"))).thenReturn(
                objectMapper.readTree("""
                        {"response":{"status":"done"}}
                        """)
        );
        when(videoOpsDataService.createContentIdea(any())).thenReturn(
                objectMapper.readTree("""
                        {"id":42,"topic":"Created idea"}
                        """)
        );
        when(videoOpsDataService.getContentIdea(eq(42L))).thenReturn(
                objectMapper.readTree("""
                        {"id":42,"topic":"Created idea"}
                        """)
        );
        when(videoOpsDataService.patchContentIdea(eq(42L), any())).thenReturn(
                objectMapper.readTree("""
                        {"id":42,"topic":"Patched idea"}
                        """)
        );
        when(videoOpsDataService.getTikTokAccountByOpenId(eq("open-id-demo"))).thenReturn(
                objectMapper.readTree("""
                        [{"id":5,"open_id":"open-id-demo"}]
                        """)
        );
        when(videoOpsDataService.patchTikTokAccount(eq(5L), any())).thenReturn(
                objectMapper.readTree("""
                        [{"id":5,"open_id":"open-id-updated"}]
                        """)
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
                .andExpect(jsonPath("$.content[0].id").value(42));

        verify(videoOpsService).fetchContentIdeas(any(Pageable.class));
    }

    @Test
    void allowsAuthenticatedAdminToReadObservability() throws Exception {
        mockMvc.perform(get("/api/video-ops/observability")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentRuns[0].id").value(99))
                .andExpect(jsonPath("$.recentErrors[0].severity").value("ERROR"));
    }

    @Test
    void allowsAuthenticatedAdminToReadAccountsOverview() throws Exception {
        mockMvc.perform(get("/api/video-ops/accounts")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tiktokAccounts[0].openId").value("open-id-demo"))
                .andExpect(jsonPath("$.serviceConnections[0].providerKey").value("GROQ"))
                .andExpect(jsonPath("$.readiness.ready").value(true));
    }

    @Test
    void allowsAuthenticatedAdminToReadAccountsReadiness() throws Exception {
        mockMvc.perform(get("/api/video-ops/accounts/readiness")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(false))
                .andExpect(jsonPath("$.missingItems[0]").value("Shotstack"));
    }

    @Test
    void allowsProtectedPostRoutesWithoutCsrfWhenRouteIsExplicitlyIgnored() throws Exception {
        mockMvc.perform(post("/api/video-ops/workflows/check-shotstack")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentIdeaId\":42,\"topic\":\"Idea\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(7));
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

    @Test
    void acceptsWorkflowCompletionCallbackWhenResponsePayloadIsAnObject() throws Exception {
        mockMvc.perform(post("/api/video-ops/workflow-runs/99/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Callback-Secret", "video-ops-callback-123")
                        .content("""
                                {"status":"SUCCEEDED","message":"Workflow termine","responsePayload":{"contentIdeaId":42,"uploadUrl":"https://example.test/upload"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"));

        verify(videoOpsService).completeWorkflowRun(
                eq(99L),
                argThat(request -> "SUCCEEDED".equals(request.getStatus())
                        && request.getResponsePayload() != null
                        && request.getResponsePayload().contains("\"contentIdeaId\":42"))
        );
    }

    @Test
    void acceptsWorkflowCompletionCallbackWithFormEncodedPayload() throws Exception {
        mockMvc.perform(post("/api/video-ops/workflow-runs/99/complete")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .header("X-Video-Ops-Callback-Secret", "video-ops-callback-123")
                        .content("status=FAILED&message=workflow+failed&errorMessage=boom"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99));

        verify(videoOpsService).completeWorkflowRun(
                eq(99L),
                argThat(request -> "FAILED".equals(request.getStatus())
                        && "boom".equals(request.getErrorMessage()))
        );
    }

    @Test
    void acceptsInternalContentIdeaCrudRequestsWithInternalSecret() throws Exception {
        mockMvc.perform(post("/api/video-ops/internal/content-ideas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"category":"Fitness","topic":"Created idea"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42));

        mockMvc.perform(get("/api/video-ops/internal/content-ideas/42")
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Created idea"));

        mockMvc.perform(patch("/api/video-ops/internal/content-ideas/42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"topic":"Patched idea"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topic").value("Patched idea"));
    }

    @Test
    void acceptsInternalTikTokAccountCrudRequestsWithInternalSecret() throws Exception {
        mockMvc.perform(get("/api/video-ops/internal/tiktok-accounts")
                        .param("openId", "open-id-demo")
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].open_id").value("open-id-demo"));

        mockMvc.perform(patch("/api/video-ops/internal/tiktok-accounts/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"open_id":"open-id-updated"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].open_id").value("open-id-updated"));
    }

    @Test
    void acceptsInternalInitPublishContextRequestWithInternalSecret() throws Exception {
        mockMvc.perform(post("/api/video-ops/internal/tiktok/init-publish-context")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"contentIdeaId":42,"tiktokAccountOpenId":"open-id-demo"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentIdeaId").value(42))
                .andExpect(jsonPath("$.tiktokAccountOpenId").value("open-id-demo"))
                .andExpect(jsonPath("$.selectedPrivacyLevel").value("SELF_ONLY"));
    }

    @Test
    void acceptsInternalTikTokAccountContextRequestWithInternalSecret() throws Exception {
        mockMvc.perform(post("/api/video-ops/internal/tiktok/account-context")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"tiktokAccountOpenId":"open-id-demo","includeCreatorInfo":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tiktokAccountOpenId").value("open-id-demo"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    void acceptsInternalGroqProxyRequestWithInternalSecret() throws Exception {
        mockMvc.perform(post("/api/video-ops/internal/groq/chat-completions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"model":"demo","messages":[{"role":"user","content":"hello"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.choices[0].message.content").value("ok"));
    }

    @Test
    void acceptsInternalPexelsProxyRequestWithInternalSecret() throws Exception {
        mockMvc.perform(post("/api/video-ops/internal/pexels/videos/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"query":"fitness","perPage":5,"orientation":"portrait"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].id").value(1));
    }

    @Test
    void acceptsInternalShotstackProxyRequestsWithInternalSecret() throws Exception {
        mockMvc.perform(post("/api/video-ops/internal/shotstack/render")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret")
                        .content("""
                                {"timeline":{},"output":{"format":"mp4"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response.id").value("render-demo"));

        mockMvc.perform(get("/api/video-ops/internal/shotstack/render/render-demo")
                        .header("X-Video-Ops-Internal-Secret", "internal-test-secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response.status").value("done"));
    }
}

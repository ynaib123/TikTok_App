package com.tiktokapp.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.N8nWorkflowContractResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthAuthorizeResponse;
import com.tiktokapp.backend.dto.videoops.TikTokOAuthCallbackResponse;
import com.tiktokapp.backend.dto.videoops.VideoDashboardResponse;
import com.tiktokapp.backend.dto.videoops.VideoObservabilityResponse;
import com.tiktokapp.backend.dto.videoops.VideoOpsHealthResponse;
import com.tiktokapp.backend.service.videoops.TikTokOAuthService;
import com.tiktokapp.backend.service.videoops.VideoOpsHealthService;
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

/**
 * Couvre les controleurs extraits de VideoOpsController :
 *  - VideoOpsObservabilityController : /health, /dashboard, /observability
 *  - TikTokOAuthController          : /tiktok-oauth/authorize, /tiktok-oauth/callback
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tiktokapp-split;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
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
class SplitControllersIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VideoOpsService videoOpsService;

    @MockBean
    private VideoOpsHealthService videoOpsHealthService;

    @MockBean
    private TikTokOAuthService tikTokOAuthService;

    private String accessToken;
    private Cookie csrfCookie;
    private String csrfHeaderName;
    private String csrfToken;

    @BeforeEach
    void setUp() throws Exception {
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
                .andReturn();
        accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString()).path("token").asText();
    }

    // ----- VideoOpsObservabilityController -----

    @Test
    void healthEndpointReturnsServiceUnavailableWhenStatusDown() throws Exception {
        when(videoOpsHealthService.buildHealth()).thenReturn(
                new VideoOpsHealthResponse("DOWN", null, null, null, null, null)
        );

        mockMvc.perform(get("/api/video-ops/health")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void healthEndpointReturnsOkWhenStatusUp() throws Exception {
        when(videoOpsHealthService.buildHealth()).thenReturn(
                new VideoOpsHealthResponse("UP", null, null, null, null, null)
        );

        mockMvc.perform(get("/api/video-ops/health")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void dashboardEndpointDelegatesToService() throws Exception {
        when(videoOpsService.fetchDashboard()).thenReturn(
                new VideoDashboardResponse(List.of(), List.of(), List.of())
        );

        mockMvc.perform(get("/api/video-ops/dashboard")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        verify(videoOpsService).fetchDashboard();
    }

    @Test
    void observabilityEndpointReturnsRecentRuns() throws Exception {
        when(videoOpsService.fetchObservability()).thenReturn(
                new VideoObservabilityResponse(
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        new N8nWorkflowContractResponse(true, "service_connection", "http://n8n:5678",
                                Map.of(), List.of(), false, 0)
                )
        );

        mockMvc.perform(get("/api/video-ops/observability")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.n8nContract.healthy").value(true));
    }

    @Test
    void observabilityEndpointBlocksAnonymous() throws Exception {
        mockMvc.perform(get("/api/video-ops/observability"))
                .andExpect(status().isUnauthorized());
    }

    // ----- TikTokOAuthController -----

    @Test
    void authorizeEndpointReturnsAuthorizationUrl() throws Exception {
        when(tikTokOAuthService.createAuthorizationUrl(eq("admin@tiktokapp.local"), anyString()))
                .thenReturn(new TikTokOAuthAuthorizeResponse("https://www.tiktok.com/v2/auth?code_challenge=xyz", "state-token"));

        mockMvc.perform(post("/api/video-ops/tiktok-oauth/authorize")
                        .header("Authorization", "Bearer " + accessToken)
                        .header(csrfHeaderName, csrfToken)
                        .cookie(csrfCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"redirectPath\":\"/accounts\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authUrl").value(org.hamcrest.Matchers.startsWith("https://")));
    }

    @Test
    void authorizeEndpointBlocksAnonymous() throws Exception {
        // Sans CSRF + sans auth, Spring Security renvoie 403 (le filtre CSRF
        // est avant le filtre auth sur POST). On valide juste qu'un acces
        // anonyme est bel et bien refuse.
        mockMvc.perform(post("/api/video-ops/tiktok-oauth/authorize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void callbackEndpointDelegatesToService() throws Exception {
        when(tikTokOAuthService.completeAuthorization(eq("admin@tiktokapp.local"), eq("auth-code"), eq("state-token")))
                .thenReturn(new TikTokOAuthCallbackResponse("Compte TikTok connecte.", "/accounts", "open-id-demo", "video.publish", "Demo"));

        mockMvc.perform(post("/api/video-ops/tiktok-oauth/callback")
                        .header("Authorization", "Bearer " + accessToken)
                        .header(csrfHeaderName, csrfToken)
                        .cookie(csrfCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"auth-code\",\"state\":\"state-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openId").value("open-id-demo"));

        verify(tikTokOAuthService).completeAuthorization(any(), eq("auth-code"), eq("state-token"));
    }
}

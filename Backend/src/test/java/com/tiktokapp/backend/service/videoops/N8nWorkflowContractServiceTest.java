package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.N8nWorkflowContractResponse;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class N8nWorkflowContractServiceTest {

    @Mock
    private ServiceConnectionResolver serviceConnectionResolver;

    @Mock
    private VideoWorkflowRunRepository workflowRunRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void prefersActiveServiceConnectionPathsOverApplicationDefaults() throws Exception {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.getN8n().setBaseUrl("http://localhost:5678");
        AlertingProperties alertingProperties = new AlertingProperties();

        when(serviceConnectionResolver.findConnected(eq(com.tiktokapp.backend.model.ServiceConnectionProvider.N8N)))
                .thenReturn(new ResolvedServiceConnection(
                        "http://n8n:5678",
                        null,
                        null,
                        "n8n",
                        objectMapper.readTree("""
                                {
                                  "workflowPaths": {
                                    "mainPipeline": "/webhook/fused-idea-script",
                                    "renderTemplateVideo": "/webhook/SAn6Iepn4rCpkHJg/webhook/render-template-video",
                                    "checkShotstack": "/webhook/FVCRU7rTMuMCR1J3/webhook/check-shotstack",
                                    "initPublishTikTok": "/webhook/init-publish-tiktok"
                                  }
                                }
                                """)
                ));
        N8nWorkflowContractService service = new N8nWorkflowContractService(
                properties,
                serviceConnectionResolver,
                workflowRunRepository,
                alertingProperties
        );

        ResolvedN8nWorkflowConfiguration configuration = service.resolveConfiguration();

        assertEquals("service_connection", configuration.source());
        assertEquals("http://n8n:5678", configuration.baseUrl());
        assertEquals("/webhook/FVCRU7rTMuMCR1J3/webhook/check-shotstack", configuration.workflowPaths().get("checkShotstack"));
    }

    @Test
    void reportsWarningsWhenLegacyCallbackFallbackAndStuckRunsArePresent() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setAllowLegacyWorkflowCallbackSecret(true);
        properties.getN8n().setBaseUrl("http://localhost:5678");
        properties.getN8n().setMainPipelinePath("");

        AlertingProperties alertingProperties = new AlertingProperties();
        alertingProperties.setStuckRunThresholdSeconds(60);

        when(serviceConnectionResolver.findConnected(eq(com.tiktokapp.backend.model.ServiceConnectionProvider.N8N)))
                .thenReturn(null);
        when(workflowRunRepository.findByStatusInAndCreatedAtBefore(any(), any(Instant.class)))
                .thenReturn(List.of(new com.tiktokapp.backend.model.VideoWorkflowRun()));

        N8nWorkflowContractService service = new N8nWorkflowContractService(
                properties,
                serviceConnectionResolver,
                workflowRunRepository,
                alertingProperties
        );

        N8nWorkflowContractResponse response = service.describeContract();

        assertFalse(response.isHealthy());
        assertEquals("application_properties", response.getSource());
        assertTrue(response.getWarnings().stream().anyMatch(message -> message.contains("legacy")));
        assertTrue(response.getWarnings().stream().anyMatch(message -> message.contains("stuck-run")));
        assertEquals(1L, response.getStuckRunCount());
    }
}

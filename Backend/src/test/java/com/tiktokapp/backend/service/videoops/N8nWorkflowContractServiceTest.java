package com.tiktokapp.backend.service.videoops;

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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class N8nWorkflowContractServiceTest {

    @Mock
    private VideoWorkflowRunRepository workflowRunRepository;

    @Test
    void resolvesWebhookPathsFromApplicationProperties() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.getN8n().setBaseUrl("http://n8n:5678");
        properties.getN8n().setMainPipelinePath("/webhook/fused-idea-script");
        properties.getN8n().setRenderTemplateVideoPath("/webhook/render-template-video");
        properties.getN8n().setCheckShotstackPath("/webhook/check-shotstack");
        properties.getN8n().setInitPublishTikTokPath("/webhook/init-publish-tiktok");
        AlertingProperties alertingProperties = new AlertingProperties();

        N8nWorkflowContractService service = new N8nWorkflowContractService(
                properties,
                workflowRunRepository,
                alertingProperties
        );

        ResolvedN8nWorkflowConfiguration configuration = service.resolveConfiguration();

        assertEquals("application_properties", configuration.source());
        assertEquals("http://n8n:5678", configuration.baseUrl());
        assertEquals("/webhook/fused-idea-script", configuration.workflowPaths().get("mainPipeline"));
        assertEquals("/webhook/render-template-video", configuration.workflowPaths().get("renderTemplateVideo"));
        assertEquals("/webhook/check-shotstack", configuration.workflowPaths().get("checkShotstack"));
        assertEquals("/webhook/init-publish-tiktok", configuration.workflowPaths().get("initPublishTikTok"));
    }

    @Test
    void reportsWarningsWhenLegacyCallbackFallbackAndStuckRunsArePresent() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setAllowLegacyWorkflowCallbackSecret(true);
        properties.getN8n().setBaseUrl("http://localhost:5678");
        properties.getN8n().setMainPipelinePath("");

        AlertingProperties alertingProperties = new AlertingProperties();
        alertingProperties.setStuckRunThresholdSeconds(60);

        when(workflowRunRepository.findByStatusInAndCreatedAtBefore(any(), any(Instant.class)))
                .thenReturn(List.of(new com.tiktokapp.backend.model.VideoWorkflowRun()));

        N8nWorkflowContractService service = new N8nWorkflowContractService(
                properties,
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

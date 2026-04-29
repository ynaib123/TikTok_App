package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.tiktokapp.backend.repository.VideoPipelineEventRepository;
import com.tiktokapp.backend.repository.VideoPipelineStateRepository;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import com.tiktokapp.backend.service.TikTokUploadService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideoOpsServiceTest {

    @Mock
    private SupabaseVideoOpsGateway supabaseGateway;

    @Mock
    private N8nWorkflowGateway n8nWorkflowGateway;

    @Mock
    private TikTokUploadService tikTokUploadService;

    @Mock
    private VideoOpsCallbackAuthService callbackAuthService;

    @Mock
    private VideoPipelineStateRepository pipelineStateRepository;

    @Mock
    private VideoWorkflowRunRepository workflowRunRepository;

    @Mock
    private VideoPipelineEventRepository eventRepository;

    @Test
    void triggerMainPipelineSendsCategoryAndIdeaCountToN8n() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setIdempotencyWindowSeconds(120);

        doAnswer(invocation -> {
            VideoWorkflowRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                ReflectionTestUtils.setField(run, "id", 21L);
            }
            if (run.getCreatedAt() == null) {
                ReflectionTestUtils.setField(run, "createdAt", Instant.now());
            }
            return run;
        }).when(workflowRunRepository).save(any(VideoWorkflowRun.class));

        when(workflowRunRepository.findTopByContentIdeaIdIsNullAndWorkflowTypeOrderByCreatedAtDesc(VideoWorkflowType.MAIN_PIPELINE))
                .thenReturn(Optional.empty());
        when(workflowRunRepository.countByContentIdeaIdIsNullAndWorkflowType(VideoWorkflowType.MAIN_PIPELINE))
                .thenReturn(0L);
        when(n8nWorkflowGateway.trigger(eq(VideoWorkflowType.MAIN_PIPELINE), any()))
                .thenReturn(new ObjectMapper().createObjectNode());

        VideoOpsService service = new VideoOpsService(
                supabaseGateway,
                n8nWorkflowGateway,
                tikTokUploadService,
                callbackAuthService,
                pipelineStateRepository,
                workflowRunRepository,
                eventRepository,
                properties,
                new ObjectMapper()
        );

        WorkflowTriggerRequest request = new WorkflowTriggerRequest();
        request.setCategory("Fitness");
        request.setIdeaCount(3);
        request.setSource("test");

        service.triggerMainPipeline(request, "admin@tiktokapp.local");

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(n8nWorkflowGateway).trigger(eq(VideoWorkflowType.MAIN_PIPELINE), payloadCaptor.capture());
        assertEquals("Fitness", payloadCaptor.getValue().get("category"));
        assertEquals(3, payloadCaptor.getValue().get("ideaCount"));
    }

    @Test
    void reusesRecentWorkflowRunForIdempotentRequest() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setIdempotencyWindowSeconds(120);

        VideoWorkflowRun recentRun = new VideoWorkflowRun();
        recentRun.setContentIdeaId(55L);
        recentRun.setWorkflowType(VideoWorkflowType.CHECK_SHOTSTACK);
        recentRun.setStatus(VideoWorkflowRunStatus.ACCEPTED);
        recentRun.setAttemptNumber(2);
        recentRun.setIdempotencyKey("CHECK_SHOTSTACK:55");
        ReflectionTestUtils.setField(recentRun, "id", 12L);
        ReflectionTestUtils.setField(recentRun, "createdAt", Instant.now());

        when(workflowRunRepository.findTopByContentIdeaIdAndWorkflowTypeOrderByCreatedAtDesc(55L, VideoWorkflowType.CHECK_SHOTSTACK))
                .thenReturn(Optional.of(recentRun));

        VideoOpsService service = new VideoOpsService(
                supabaseGateway,
                n8nWorkflowGateway,
                tikTokUploadService,
                callbackAuthService,
                pipelineStateRepository,
                workflowRunRepository,
                eventRepository,
                properties,
                new ObjectMapper()
        );

        WorkflowTriggerRequest request = new WorkflowTriggerRequest();
        request.setContentIdeaId(55L);
        request.setTopic("Idea");
        request.setSource("test");

        VideoWorkflowActionResponse response = service.triggerCheckShotstack(request, "admin@tiktokapp.local");

        assertTrue(response.isReused());
        assertEquals(12L, response.getRunId());
        assertEquals("ACCEPTED", response.getStatus());
        verify(n8nWorkflowGateway, never()).trigger(any(), any());
    }
}

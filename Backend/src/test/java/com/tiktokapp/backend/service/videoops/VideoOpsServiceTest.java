package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunDetailResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
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
    private ContentIdeaRepository contentIdeaRepository;

    @Mock
    private N8nWorkflowGateway n8nWorkflowGateway;

    @Mock
    private VideoOpsInternalProxyService videoOpsInternalProxyService;

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

    @Mock
    private VideoOpsRunPersistenceHelper runPersistenceHelper;

    @Mock
    private N8nWorkflowContractService n8nWorkflowContractService;

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
        }).when(runPersistenceHelper).saveAndCommit(any(VideoWorkflowRun.class));

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
                contentIdeaRepository,
                n8nWorkflowGateway,
                videoOpsInternalProxyService,
                tikTokUploadService,
                callbackAuthService,
                pipelineStateRepository,
                workflowRunRepository,
                eventRepository,
                properties,
                new ObjectMapper(),
                runPersistenceHelper,
                n8nWorkflowContractService
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
    void checkShotstackMarksRunSucceededWhenRenderIsAlreadyReady() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setIdempotencyWindowSeconds(120);

        doAnswer(invocation -> {
            VideoWorkflowRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                ReflectionTestUtils.setField(run, "id", 12L);
            }
            if (run.getCreatedAt() == null) {
                ReflectionTestUtils.setField(run, "createdAt", Instant.now());
            }
            return run;
        }).when(runPersistenceHelper).saveAndCommit(any(VideoWorkflowRun.class));

        doAnswer(invocation -> {
            VideoWorkflowRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                ReflectionTestUtils.setField(run, "id", 12L);
            }
            if (run.getCreatedAt() == null) {
                ReflectionTestUtils.setField(run, "createdAt", Instant.now());
            }
            return run;
        }).when(workflowRunRepository).save(any(VideoWorkflowRun.class));

        when(supabaseGateway.fetchContentIdeaById(55L))
                .thenReturn(new ObjectMapper().valueToTree(java.util.List.of(Map.of(
                        "id", 55,
                        "shotstack_render_id", "render-123",
                        "shotstack_status", "done",
                        "shotstack_url", "https://cdn.example.com/video.mp4"
                ))));

        VideoOpsService service = new VideoOpsService(
                supabaseGateway,
                contentIdeaRepository,
                n8nWorkflowGateway,
                videoOpsInternalProxyService,
                tikTokUploadService,
                callbackAuthService,
                pipelineStateRepository,
                workflowRunRepository,
                eventRepository,
                properties,
                new ObjectMapper(),
                runPersistenceHelper,
                n8nWorkflowContractService
        );

        WorkflowTriggerRequest request = new WorkflowTriggerRequest();
        request.setContentIdeaId(55L);
        request.setTopic("Idea");
        request.setSource("test");

        VideoWorkflowActionResponse response = service.triggerCheckShotstack(request, "admin@tiktokapp.local");

        assertTrue(!response.isReused());
        assertEquals(12L, response.getRunId());
        assertEquals("SUCCEEDED", response.getStatus());
        verify(n8nWorkflowGateway, never()).trigger(any(), any());
    }

    @Test
    void triggerRenderTemplateAcceptsEmptyInlineWebhookBody() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setIdempotencyWindowSeconds(120);

        doAnswer(invocation -> {
            VideoWorkflowRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                ReflectionTestUtils.setField(run, "id", 34L);
            }
            if (run.getCreatedAt() == null) {
                ReflectionTestUtils.setField(run, "createdAt", Instant.now());
            }
            return run;
        }).when(runPersistenceHelper).saveAndCommit(any(VideoWorkflowRun.class));

        doAnswer(invocation -> {
            VideoWorkflowRun run = invocation.getArgument(0);
            if (run.getId() == null) {
                ReflectionTestUtils.setField(run, "id", 34L);
            }
            if (run.getCreatedAt() == null) {
                ReflectionTestUtils.setField(run, "createdAt", Instant.now());
            }
            return run;
        }).when(workflowRunRepository).save(any(VideoWorkflowRun.class));

        when(workflowRunRepository.countByContentIdeaIdAndWorkflowType(19L, VideoWorkflowType.RENDER_TEMPLATE_VIDEO))
                .thenReturn(0L);
        when(supabaseGateway.fetchContentIdeaById(19L))
                .thenReturn(new ObjectMapper().valueToTree(java.util.List.of(Map.of(
                        "id", 19,
                        "topic", "Idea",
                        "scripts", "Script body",
                        "caption", "Caption",
                        "background_keyword", "Keyword",
                        "tiktok_account_open_id", "open-id-19"
                ))));
        when(n8nWorkflowGateway.trigger(eq(VideoWorkflowType.RENDER_TEMPLATE_VIDEO), any()))
                .thenReturn(new ObjectMapper().createObjectNode());

        VideoOpsService service = new VideoOpsService(
                supabaseGateway,
                contentIdeaRepository,
                n8nWorkflowGateway,
                videoOpsInternalProxyService,
                tikTokUploadService,
                callbackAuthService,
                pipelineStateRepository,
                workflowRunRepository,
                eventRepository,
                properties,
                new ObjectMapper(),
                runPersistenceHelper,
                n8nWorkflowContractService
        );

        WorkflowTriggerRequest request = new WorkflowTriggerRequest();
        request.setContentIdeaId(19L);
        request.setSource("test");
        request.setForce(true);

        VideoWorkflowActionResponse response = service.triggerRenderTemplate(request, "admin@tiktokapp.local");

        assertEquals(34L, response.getRunId());
        assertEquals("ACCEPTED", response.getStatus());
        verify(n8nWorkflowGateway).trigger(eq(VideoWorkflowType.RENDER_TEMPLATE_VIDEO), any());
    }

    @Test
    void completeWorkflowRunAcceptsLegacySuccessAliasesFromN8n() {
        VideoOpsProperties properties = new VideoOpsProperties();
        properties.setIdempotencyWindowSeconds(120);

        VideoWorkflowRun existingRun = new VideoWorkflowRun();
        ReflectionTestUtils.setField(existingRun, "id", 77L);
        ReflectionTestUtils.setField(existingRun, "createdAt", Instant.now());
        existingRun.setContentIdeaId(19L);
        existingRun.setWorkflowType(VideoWorkflowType.RENDER_TEMPLATE_VIDEO);
        existingRun.setStatus(VideoWorkflowRunStatus.ACCEPTED);
        existingRun.setAttemptNumber(1);

        when(workflowRunRepository.findById(77L)).thenReturn(Optional.of(existingRun));
        when(workflowRunRepository.save(any(VideoWorkflowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoOpsService service = new VideoOpsService(
                supabaseGateway,
                contentIdeaRepository,
                n8nWorkflowGateway,
                videoOpsInternalProxyService,
                tikTokUploadService,
                callbackAuthService,
                pipelineStateRepository,
                workflowRunRepository,
                eventRepository,
                properties,
                new ObjectMapper(),
                runPersistenceHelper,
                n8nWorkflowContractService
        );

        VideoWorkflowRunCompletionRequest request = new VideoWorkflowRunCompletionRequest();
        request.setStatus("rendering_requested");
        request.setMessage("Render demande a Shotstack.");
        request.setResponsePayload("{\"contentIdeaId\":19,\"shotstackRenderId\":\"render-xyz\"}");

        VideoWorkflowRunDetailResponse response = service.completeWorkflowRun(77L, request);

        assertEquals("SUCCEEDED", response.getStatus());
        verify(workflowRunRepository).save(any(VideoWorkflowRun.class));
    }
}

package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.videoops.VideoWorkflowRunCompletionRequest;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkflowCallbackServiceIdempotencyTest {

    private VideoWorkflowRunRepository workflowRunRepository;
    private VideoOpsTrackingService trackingService;
    private VideoOpsCallbackAuthService callbackAuthService;
    private WorkflowCallbackService service;

    @BeforeEach
    void setUp() {
        workflowRunRepository = mock(VideoWorkflowRunRepository.class);
        trackingService = mock(VideoOpsTrackingService.class);
        callbackAuthService = mock(VideoOpsCallbackAuthService.class);
        service = new WorkflowCallbackService(
                workflowRunRepository, trackingService, callbackAuthService,
                new RenderEventBroadcaster(new ObjectMapper()));
    }

    @Test
    void completeRun_acceptsCallback_whenIdempotencyKeyAbsent() {
        VideoWorkflowRun run = pendingRun(42L, "MAIN_PIPELINE:7");
        when(workflowRunRepository.findById(42L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(VideoWorkflowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoWorkflowRunCompletionRequest request = succeededRequest();

        var response = service.completeRun(42L, request, null);

        assertThat(response.getStatus()).isEqualTo("SUCCEEDED");
        verify(workflowRunRepository).save(any(VideoWorkflowRun.class));
    }

    @Test
    void completeRun_acceptsCallback_whenIdempotencyKeyMatches() {
        VideoWorkflowRun run = pendingRun(42L, "MAIN_PIPELINE:7");
        when(workflowRunRepository.findById(42L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(VideoWorkflowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.completeRun(42L, succeededRequest(), "MAIN_PIPELINE:7");

        assertThat(response.getStatus()).isEqualTo("SUCCEEDED");
    }

    @Test
    void completeRun_rejectsWith409_whenIdempotencyKeyMismatch() {
        VideoWorkflowRun run = pendingRun(42L, "MAIN_PIPELINE:7");
        when(workflowRunRepository.findById(42L)).thenReturn(Optional.of(run));

        assertThatThrownBy(() -> service.completeRun(42L, succeededRequest(), "MAIN_PIPELINE:99"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(workflowRunRepository, never()).save(any(VideoWorkflowRun.class));
        verify(trackingService, never()).syncPipelineState(anyLong(), any(), anyString(), any());
    }

    @Test
    void completeRun_acceptsCallback_whenIdempotencyKeyMatchesIgnoringWhitespace() {
        VideoWorkflowRun run = pendingRun(42L, "RENDER_TEMPLATE_VIDEO:11");
        when(workflowRunRepository.findById(42L)).thenReturn(Optional.of(run));
        when(workflowRunRepository.save(any(VideoWorkflowRun.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.completeRun(42L, succeededRequest(), "  RENDER_TEMPLATE_VIDEO:11  ");

        assertThat(response.getStatus()).isEqualTo("SUCCEEDED");
    }

    @Test
    void completeRun_idempotentReturn_whenRunAlreadyTerminal() {
        VideoWorkflowRun run = pendingRun(42L, "MAIN_PIPELINE:7");
        run.setStatus(VideoWorkflowRunStatus.SUCCEEDED);
        when(workflowRunRepository.findById(42L)).thenReturn(Optional.of(run));

        var response = service.completeRun(42L, succeededRequest(), "MAIN_PIPELINE:7");

        // Pas de re-save : on remonte juste le run terminal
        verify(workflowRunRepository, never()).save(any(VideoWorkflowRun.class));
        assertThat(response.getStatus()).isEqualTo("SUCCEEDED");
    }

    @Test
    void completeRun_throws404_whenRunMissing() {
        when(workflowRunRepository.findById(eq(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.completeRun(99L, succeededRequest(), "MAIN_PIPELINE:7"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    private static VideoWorkflowRun pendingRun(long id, String idempotencyKey) {
        VideoWorkflowRun run = new VideoWorkflowRun();
        run.setContentIdeaId(7L);
        run.setWorkflowType(VideoWorkflowType.MAIN_PIPELINE);
        run.setStatus(VideoWorkflowRunStatus.ACCEPTED);
        run.setIdempotencyKey(idempotencyKey);
        run.setAttemptNumber(1);
        // VideoWorkflowRun.id has no setter (DB-generated). Force via reflection so
        // the success-path code (`Map.of("runId", run.getId())`) gets a non-null id.
        try {
            var idField = VideoWorkflowRun.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(run, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        return run;
    }

    private static VideoWorkflowRunCompletionRequest succeededRequest() {
        VideoWorkflowRunCompletionRequest request = new VideoWorkflowRunCompletionRequest();
        request.setStatus("SUCCEEDED");
        request.setMessage("ok");
        return request;
    }
}

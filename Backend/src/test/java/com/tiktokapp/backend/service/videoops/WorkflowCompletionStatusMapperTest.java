package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WorkflowCompletionStatusMapperTest {

    @Test
    void mapsKnownSuccessAliasesToSucceeded() {
        assertEquals(VideoWorkflowRunStatus.SUCCEEDED, WorkflowCompletionStatusMapper.toRunStatus("rendering_requested"));
        assertEquals(VideoWorkflowRunStatus.SUCCEEDED, WorkflowCompletionStatusMapper.toRunStatus("init done"));
        assertEquals(VideoWorkflowRunStatus.SUCCEEDED, WorkflowCompletionStatusMapper.toRunStatus("ok"));
    }

    @Test
    void mapsKnownFailureAliasesToFailed() {
        assertEquals(VideoWorkflowRunStatus.FAILED, WorkflowCompletionStatusMapper.toRunStatus("error"));
        assertEquals(VideoWorkflowRunStatus.FAILED, WorkflowCompletionStatusMapper.toRunStatus("FAIL"));
    }

    @Test
    void rejectsUnknownStatuses() {
        assertThrows(ResponseStatusException.class, () -> WorkflowCompletionStatusMapper.toRunStatus("pending"));
    }
}

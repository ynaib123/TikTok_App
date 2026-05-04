package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.repository.VideoWorkflowRunRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
class VideoOpsRunPersistenceHelper {

    private final VideoWorkflowRunRepository workflowRunRepository;

    VideoOpsRunPersistenceHelper(VideoWorkflowRunRepository workflowRunRepository) {
        this.workflowRunRepository = workflowRunRepository;
    }

    // REQUIRES_NEW commits the run independently so n8n's synchronous callback
    // can find it via findById before the outer triggerWorkflow transaction commits.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public VideoWorkflowRun saveAndCommit(VideoWorkflowRun run) {
        return workflowRunRepository.save(run);
    }
}

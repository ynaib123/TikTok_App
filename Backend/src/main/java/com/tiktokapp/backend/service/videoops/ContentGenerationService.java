package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoWorkflowType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static com.tiktokapp.backend.service.videoops.VideoOpsCommonHelpers.trimToNull;

/**
 * Owns the "main pipeline" workflow that asks n8n + the LLM to generate
 * fresh content ideas (and their initial scripts) for the operator.
 */
@Service
public class ContentGenerationService {

    private final WorkflowOrchestrator workflowOrchestrator;

    public ContentGenerationService(WorkflowOrchestrator workflowOrchestrator) {
        this.workflowOrchestrator = workflowOrchestrator;
    }

    @Transactional
    public VideoWorkflowActionResponse triggerMainPipeline(WorkflowTriggerRequest request, String requestedByEmail) {
        validateMainPipelineRequest(request);
        return workflowOrchestrator.triggerWorkflow(
                VideoWorkflowType.MAIN_PIPELINE,
                null,
                request,
                requestedByEmail,
                VideoOpsStateMachine.requestedStage(VideoWorkflowType.MAIN_PIPELINE)
        );
    }

    private void validateMainPipelineRequest(WorkflowTriggerRequest request) {
        String category = trimToNull(request.getCategory());
        if (category == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "category est obligatoire pour la generation d idees.");
        }
        Integer ideaCount = request.getIdeaCount();
        if (ideaCount == null || ideaCount < 1 || ideaCount > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "ideaCount doit etre compris entre 1 et 5.");
        }
    }
}

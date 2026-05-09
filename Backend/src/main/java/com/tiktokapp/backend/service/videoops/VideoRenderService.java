package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoWorkflowType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owns the Remotion render workflow trigger. The legacy Shotstack trigger
 * is kept as a 410 GONE shim so old clients fail loudly instead of silently
 * doing nothing.
 */
@Service
public class VideoRenderService {

    private final WorkflowOrchestrator workflowOrchestrator;

    public VideoRenderService(WorkflowOrchestrator workflowOrchestrator) {
        this.workflowOrchestrator = workflowOrchestrator;
    }

    @Transactional
    public VideoWorkflowActionResponse triggerRenderTemplate(WorkflowTriggerRequest request, String requestedByEmail) {
        Long contentIdeaId = requireContentIdeaId(request.getContentIdeaId(),
                "contentIdeaId est obligatoire pour le rendu video.");
        return workflowOrchestrator.triggerWorkflow(
                VideoWorkflowType.RENDER_TEMPLATE_VIDEO,
                contentIdeaId,
                request,
                requestedByEmail,
                VideoOpsStateMachine.requestedStage(VideoWorkflowType.RENDER_TEMPLATE_VIDEO)
        );
    }

    @Transactional
    public VideoWorkflowActionResponse triggerCheckShotstack(WorkflowTriggerRequest request, String requestedByEmail) {
        throw new ResponseStatusException(HttpStatus.GONE,
                "Shotstack n'est plus utilise. Relance le rendu Remotion.");
    }

    private Long requireContentIdeaId(Long contentIdeaId, String message) {
        if (contentIdeaId == null || contentIdeaId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return contentIdeaId;
    }
}

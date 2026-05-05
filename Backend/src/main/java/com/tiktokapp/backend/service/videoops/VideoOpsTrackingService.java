package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.videoops.VideoPipelineEventResponse;
import com.tiktokapp.backend.model.VideoPipelineEvent;
import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoPipelineState;
import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.repository.VideoPipelineEventRepository;
import com.tiktokapp.backend.repository.VideoPipelineStateRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class VideoOpsTrackingService {

    private final VideoPipelineStateRepository pipelineStateRepository;
    private final VideoPipelineEventRepository eventRepository;
    private final ObjectMapper objectMapper;

    public VideoOpsTrackingService(
            VideoPipelineStateRepository pipelineStateRepository,
            VideoPipelineEventRepository eventRepository,
            ObjectMapper objectMapper
    ) {
        this.pipelineStateRepository = pipelineStateRepository;
        this.eventRepository = eventRepository;
        this.objectMapper = objectMapper;
    }

    public void syncPipelineState(Long contentIdeaId, VideoPipelineStage stage, String lastError, VideoWorkflowRun run) {
        if (contentIdeaId == null) {
            return;
        }

        VideoPipelineState state = pipelineStateRepository.findById(contentIdeaId).orElseGet(() -> {
            VideoPipelineState next = new VideoPipelineState();
            next.setContentIdeaId(contentIdeaId);
            return next;
        });
        VideoPipelineStage currentStage = state.getPipelineStage();
        if (VideoOpsStateMachine.canTransition(currentStage, stage)) {
            state.setPipelineStage(stage);
        }
        state.setLastWorkflowType(run.getWorkflowType());
        state.setLastWorkflowRunId(run.getId());
        state.setLastErrorMessage(trimToNull(lastError));
        pipelineStateRepository.save(state);
    }

    public void recordEvent(Long contentIdeaId, VideoWorkflowRun run, String severity, String eventType, String message, Map<String, Object> payload) {
        VideoPipelineEvent event = new VideoPipelineEvent();
        event.setContentIdeaId(contentIdeaId);
        event.setWorkflowRunId(run != null ? run.getId() : null);
        event.setSeverity(severity);
        event.setEventType(eventType);
        event.setMessage(message);
        event.setPayloadJson(json(payload));
        eventRepository.save(event);
    }

    public VideoPipelineStage currentStage(Long contentIdeaId) {
        if (contentIdeaId == null) {
            return VideoPipelineStage.UNKNOWN;
        }
        return pipelineStateRepository.findById(contentIdeaId)
                .map(VideoPipelineState::getPipelineStage)
                .orElse(VideoPipelineStage.UNKNOWN);
    }

    public VideoPipelineEventResponse toEventResponse(VideoPipelineEvent event) {
        return new VideoPipelineEventResponse(
                event.getContentIdeaId(),
                event.getWorkflowRunId(),
                event.getSeverity(),
                event.getEventType(),
                event.getMessage(),
                event.getCreatedAt() == null ? null : event.getCreatedAt().toString()
        );
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            return "{\"error\":\"serialization_failed\"}";
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }
}

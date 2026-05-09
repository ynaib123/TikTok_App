package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Broadcasts agent-run lifecycle events to every active SSE subscriber.
 *
 * <p>Powers the AI Agents 3D supervision page — particles ride the connections
 * between User / Agent / Backend / Postgres in response to {@code start} /
 * {@code tool_use} / {@code finish} events; the Matrix terminal prints each
 * one as a streamed line.
 */
@Component
public class AgentRunBroadcaster {

    private static final Logger logger = LoggerFactory.getLogger(AgentRunBroadcaster.class);

    private final ObjectMapper objectMapper;
    private final Set<SseEmitter> emitters = new CopyOnWriteArraySet<>();

    public AgentRunBroadcaster(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(t -> emitters.remove(emitter));
        return emitter;
    }

    public void publish(String eventType, Map<String, Object> payload) {
        if (emitters.isEmpty()) return;
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            json = "{\"error\":\"serialize_failed\"}";
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventType).data(json));
            } catch (IOException | IllegalStateException ex) {
                logger.debug("agent_runs_sse subscriber dropped : {}", ex.getMessage());
                emitter.complete();
                emitters.remove(emitter);
            }
        }
    }
}

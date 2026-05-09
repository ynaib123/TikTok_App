package com.tiktokapp.backend.service.videoops;

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
 * Lot 7 / H3 — fan-out SSE broadcaster for render lifecycle events.
 *
 * <p>The TikTok journey UI subscribes to {@code /api/video-ops/render-events/stream}
 * after the operator grants Notification permission, so a render that finishes
 * 12 minutes later still pings the user without polling.
 */
@Component
public class RenderEventBroadcaster {

    private static final Logger logger = LoggerFactory.getLogger(RenderEventBroadcaster.class);

    private final ObjectMapper objectMapper;
    private final Set<SseEmitter> emitters = new CopyOnWriteArraySet<>();

    public RenderEventBroadcaster(ObjectMapper objectMapper) {
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
                logger.debug("render_events_sse subscriber dropped : {}", ex.getMessage());
                emitter.complete();
                emitters.remove(emitter);
            }
        }
    }
}

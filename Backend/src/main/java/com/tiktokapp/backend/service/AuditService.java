package com.tiktokapp.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.AuditEvent;
import com.tiktokapp.backend.repository.AuditEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Phase 1.8 — append-only audit log of admin actions.
 * Calls are async to avoid blocking the request thread.
 */
@Service
public class AuditService {

    private static final Logger logger = LoggerFactory.getLogger(AuditService.class);
    private static final int MAX_USER_AGENT = 512;

    private final AuditEventRepository repository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Async
    public void log(String action, String resourceType, String resourceId, Object payload) {
        log(null, null, action, resourceType, resourceId, payload);
    }

    @Async
    public void log(Long adminId, String adminEmail, String action,
                     String resourceType, String resourceId, Object payload) {
        try {
            AuditEvent event = new AuditEvent();
            event.setAdminId(adminId);
            event.setAdminEmail(adminEmail);
            event.setAction(action);
            event.setResourceType(resourceType);
            event.setResourceId(resourceId);
            event.setTraceId(MDC.get("traceId"));
            event.setPayloadJson(serialize(payload));

            HttpServletRequest request = currentRequest();
            if (request != null) {
                event.setIpAddress(extractIp(request));
                String ua = request.getHeader("User-Agent");
                if (ua != null && ua.length() > MAX_USER_AGENT) {
                    ua = ua.substring(0, MAX_USER_AGENT);
                }
                event.setUserAgent(ua);
            }

            repository.save(event);
        } catch (Exception exception) {
            logger.warn("audit log failed action={} reason={}", action, exception.getMessage());
        }
    }

    private String serialize(Object payload) {
        if (payload == null) return null;
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            return "{\"error\":\"serialize-failed\"}";
        }
    }

    private HttpServletRequest currentRequest() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attrs == null ? null : attrs.getRequest();
        } catch (Exception exception) {
            return null;
        }
    }

    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

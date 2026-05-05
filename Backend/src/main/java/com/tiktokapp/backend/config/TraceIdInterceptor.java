package com.tiktokapp.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

/**
 * Phase 1.3 — Injects a request-scoped trace id into the SLF4J MDC
 * so every log line includes %X{traceId}. Honours an inbound
 * X-Request-Id header when present, otherwise generates a UUID.
 * The same id is echoed back to the caller in the response header.
 */
@Component
public class TraceIdInterceptor implements HandlerInterceptor {

    public static final String HEADER_NAME = "X-Request-Id";
    public static final String MDC_KEY = "traceId";

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                              @NonNull HttpServletResponse response,
                              @NonNull Object handler) {
        String inbound = request.getHeader(HEADER_NAME);
        String traceId = (inbound == null || inbound.isBlank())
                ? UUID.randomUUID().toString()
                : inbound.trim();
        MDC.put(MDC_KEY, traceId);
        response.setHeader(HEADER_NAME, traceId);
        return true;
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request,
                                 @NonNull HttpServletResponse response,
                                 @NonNull Object handler,
                                 @Nullable Exception ex) {
        MDC.remove(MDC_KEY);
    }
}

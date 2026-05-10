package com.tiktokapp.backend.web.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Propage un X-Trace-Id end-to-end (frontend → backend → n8n → RenderVideo).
 * Si le header entrant est absent ou invalide, génère un UUID aléatoire.
 * Toujours répondu dans X-Trace-Id pour que le frontend puisse logger la corrélation.
 *
 * Expose également workflowRunId et contentIdeaId via MDC quand détectables dans l'URL.
 */
@Component
@Order(1)
public class TraceIdFilter extends OncePerRequestFilter {

    public static final String HEADER_TRACE_ID   = "X-Trace-Id";
    public static final String MDC_TRACE_ID       = "traceId";
    public static final String MDC_WORKFLOW_RUN   = "workflowRunId";
    public static final String MDC_CONTENT_IDEA   = "contentIdeaId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String traceId = sanitize(request.getHeader(HEADER_TRACE_ID));
        if (traceId == null) {
            traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }
        MDC.put(MDC_TRACE_ID, traceId);

        // Extraire workflowRunId et contentIdeaId depuis l'URI si présents
        String uri = request.getRequestURI();
        extractPathId(uri, "/workflow-runs/",   "/complete",  MDC_WORKFLOW_RUN);
        extractPathId(uri, "/content-ideas/", null,           MDC_CONTENT_IDEA);

        response.setHeader(HEADER_TRACE_ID, traceId);

        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_TRACE_ID);
            MDC.remove(MDC_WORKFLOW_RUN);
            MDC.remove(MDC_CONTENT_IDEA);
        }
    }

    private void extractPathId(String uri, String prefix, String suffix, String mdcKey) {
        int start = uri.indexOf(prefix);
        if (start < 0) return;
        int valueStart = start + prefix.length();
        int valueEnd = uri.length();
        if (suffix != null) {
            int suffixIdx = uri.indexOf(suffix, valueStart);
            if (suffixIdx > valueStart) valueEnd = suffixIdx;
        } else {
            int slash = uri.indexOf('/', valueStart);
            if (slash > valueStart) valueEnd = slash;
        }
        String raw = uri.substring(valueStart, valueEnd);
        try {
            Long.parseLong(raw);
            MDC.put(mdcKey, raw);
        } catch (NumberFormatException ignored) {}
    }

    private static String sanitize(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        // Accepter UUID standard ou hex court (16-36 chars alphanumérique + tirets)
        if (trimmed.length() >= 8 && trimmed.length() <= 36 && trimmed.matches("[a-zA-Z0-9\\-]+")) {
            return trimmed;
        }
        return null;
    }
}

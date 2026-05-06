package com.tiktokapp.backend.config;

/**
 * Centralised contract between the backend and n8n workflows.
 *
 * Every backend → n8n trigger MUST send {@link #HEADER_REQUEST_ID} (carries the
 * MDC traceId) and {@link #HEADER_CONTRACT_VERSION}. Every n8n → backend
 * callback MUST echo the same {@link #HEADER_REQUEST_ID} so that logs on both
 * sides share the same correlation id.
 */
public final class WorkflowContract {

    /** Major version of the workflow contract. Bump when callbacks break wire-compat. */
    public static final String CONTRACT_VERSION = "1";

    /** Trace propagation header (matches {@link TraceIdInterceptor#HEADER_NAME}). */
    public static final String HEADER_REQUEST_ID = "X-Request-Id";

    /** Major-version contract header sent on every trigger and expected on every callback. */
    public static final String HEADER_CONTRACT_VERSION = "X-Workflow-Contract-Version";

    /**
     * Idempotency key header. Backend includes the run's idempotency key in the
     * trigger payload; n8n MUST echo the same value in the callback header so the
     * backend can detect / reject replays whose key does not match the active run.
     * Absence is tolerated for legacy callbacks.
     */
    public static final String HEADER_IDEMPOTENCY_KEY = "X-Idempotency-Key";

    private WorkflowContract() {
        // utility
    }
}

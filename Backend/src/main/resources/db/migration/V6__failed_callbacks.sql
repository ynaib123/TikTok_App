-- Phase 2.5 — dead-letter queue for callbacks that fail to process.

CREATE TABLE IF NOT EXISTS failed_callbacks (
    id              BIGSERIAL PRIMARY KEY,
    run_id          BIGINT,
    workflow_type   VARCHAR(64),
    payload_json    TEXT,
    error_message   VARCHAR(2048),
    attempt_count   INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_retry_at   TIMESTAMP WITH TIME ZONE,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    resolution      VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_failed_callbacks_unresolved_next_retry
    ON failed_callbacks (next_retry_at)
    WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_failed_callbacks_run_id
    ON failed_callbacks (run_id);

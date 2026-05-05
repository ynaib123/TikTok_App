-- Phase 1.8 — append-only audit log of admin actions.

CREATE TABLE IF NOT EXISTS audit_events (
    id            BIGSERIAL PRIMARY KEY,
    admin_id      BIGINT,
    admin_email   VARCHAR(320),
    action        VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64),
    resource_id   VARCHAR(128),
    payload_json  TEXT,
    ip_address    VARCHAR(64),
    user_agent    VARCHAR(512),
    trace_id      VARCHAR(64),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_admin_created
    ON audit_events (admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action_created
    ON audit_events (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource
    ON audit_events (resource_type, resource_id);

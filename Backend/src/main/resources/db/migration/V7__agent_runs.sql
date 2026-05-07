-- Phase 3.1 — AI agent invocation log (cost, tokens, latency, audit).

CREATE TABLE IF NOT EXISTS agent_runs (
    id            BIGSERIAL PRIMARY KEY,
    agent_id      VARCHAR(64) NOT NULL,
    admin_id      BIGINT,
    admin_email   VARCHAR(320),
    status        VARCHAR(32) NOT NULL,
    input_json    TEXT,
    output_json   TEXT,
    error_message VARCHAR(2048),
    tokens_in     INTEGER,
    tokens_out    INTEGER,
    cost_usd      NUMERIC(10, 6),
    model_id      VARCHAR(128),
    started_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    finished_at   TIMESTAMP WITH TIME ZONE,
    duration_ms   INTEGER,
    trace_id      VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_started
    ON agent_runs (agent_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_admin_started
    ON agent_runs (admin_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_status
    ON agent_runs (status);

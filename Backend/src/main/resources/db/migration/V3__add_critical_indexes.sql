-- Phase 1.1 — critical indexes for query performance.

CREATE INDEX IF NOT EXISTS idx_content_ideas_id_desc
    ON content_ideas (id DESC);

CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_open_id
    ON tiktok_accounts (open_id);

CREATE INDEX IF NOT EXISTS idx_video_pipeline_events_idea_created
    ON video_pipeline_events (content_idea_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_workflow_runs_idea_created
    ON video_workflow_runs (content_idea_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_workflow_runs_idempotency
    ON video_workflow_runs (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_video_workflow_runs_status
    ON video_workflow_runs (status);

CREATE INDEX IF NOT EXISTS idx_service_connections_provider_active
    ON service_connections (provider_key, is_active);

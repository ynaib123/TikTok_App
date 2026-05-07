-- Phase 1.6 — persist refresh tokens to survive backend restarts.

CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
    jti           VARCHAR(64)  PRIMARY KEY,
    token_value   VARCHAR(2048) NOT NULL,
    expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_admin_refresh_tokens_expires
    ON admin_refresh_tokens (expires_at)
    WHERE revoked_at IS NULL;

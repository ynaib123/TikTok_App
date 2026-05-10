-- Phase 3.2 — Conversations multi-tours pour agents conversationnels
-- (Supervisor Telegram, chat in-app, future bots Slack/Discord).
--
-- Design :
-- - agent_conversations : 1 ligne par fil de discussion.
--   * channel = TELEGRAM | UI | API (extensible).
--   * channel_ref = telegram chat_id, session_id UI, etc. — clé externe pour reprendre.
--   * (agent_id, channel, channel_ref) est unique tant que la conversation est ACTIVE.
--   * status passe à ARCHIVED quand un /reset ou un timeout idle survient — on garde
--     l'historique mais une nouvelle conversation pourra réutiliser la même channel_ref.
-- - agent_conversation_messages : log brut des messages (role + content_json).
--   * content_json stocke les content blocks Anthropic (text / tool_use / tool_result)
--     pour pouvoir replay la conversation telle quelle au prochain tour.
--   * On indexe (conversation_id, sequence) pour scan ordonné lors du resume.

CREATE TABLE IF NOT EXISTS agent_conversations (
    id              BIGSERIAL PRIMARY KEY,
    agent_id        VARCHAR(64) NOT NULL,
    channel         VARCHAR(32) NOT NULL,
    channel_ref     VARCHAR(128) NOT NULL,
    admin_id        BIGINT,
    admin_email     VARCHAR(320),
    status          VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at     TIMESTAMP WITH TIME ZONE,
    metadata_json   TEXT
);

-- Une seule conversation ACTIVE par (agent, channel, channel_ref) — permet de
-- reprendre le contexte entre messages Telegram successifs sans collision.
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_conversations_active
    ON agent_conversations (agent_id, channel, channel_ref)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_agent_conversations_admin
    ON agent_conversations (admin_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_channel
    ON agent_conversations (channel, channel_ref, last_message_at DESC);

CREATE TABLE IF NOT EXISTS agent_conversation_messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    sequence        INTEGER NOT NULL,
    role            VARCHAR(32) NOT NULL,
    content_json    TEXT NOT NULL,
    agent_run_id    BIGINT REFERENCES agent_runs(id) ON DELETE SET NULL,
    tokens_in       INTEGER,
    tokens_out      INTEGER,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Scan ordonné pour reconstruire l'historique au prochain tour.
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_messages_seq
    ON agent_conversation_messages (conversation_id, sequence);

CREATE INDEX IF NOT EXISTS idx_agent_messages_run
    ON agent_conversation_messages (agent_run_id)
    WHERE agent_run_id IS NOT NULL;

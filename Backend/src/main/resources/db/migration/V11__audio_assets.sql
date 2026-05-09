-- Audio assets generated for the new "Audio & Voice" journey step (Lot 4 / Mission 4).
-- Stores both voice-over takes generated via ElevenLabs and uploaded background music tracks.
-- One content_idea may have several rows (preview, final, regenerated takes) — we never delete
-- in-place so the operator can revert to a previous take.

CREATE TABLE IF NOT EXISTS audio_assets (
    id                 BIGSERIAL    PRIMARY KEY,
    content_idea_id    BIGINT       REFERENCES content_ideas(id) ON DELETE CASCADE,
    asset_kind         VARCHAR(32)  NOT NULL,
    voice_id           VARCHAR(128),
    voice_name         VARCHAR(128),
    voice_language     VARCHAR(16),
    storage_url        TEXT         NOT NULL,
    duration_ms        INTEGER,
    voice_volume       INTEGER      NOT NULL DEFAULT 100,
    music_volume       INTEGER      NOT NULL DEFAULT 30,
    elevenlabs_request TEXT,
    created_by_email   VARCHAR(255),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_selected        BOOLEAN      NOT NULL DEFAULT false,
    CHECK (asset_kind IN ('voice', 'music', 'mix')),
    CHECK (voice_volume BETWEEN 0 AND 200),
    CHECK (music_volume BETWEEN 0 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_content_idea ON audio_assets(content_idea_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_selected      ON audio_assets(content_idea_id) WHERE is_selected = true;

COMMENT ON TABLE  audio_assets IS 'Voice-over takes + music tracks attached to a content idea (Lot 4 audio step).';
COMMENT ON COLUMN audio_assets.asset_kind IS 'voice = ElevenLabs TTS take / music = background track / mix = full mix preview';
COMMENT ON COLUMN audio_assets.is_selected IS 'true for the take currently routed to the Remotion render';

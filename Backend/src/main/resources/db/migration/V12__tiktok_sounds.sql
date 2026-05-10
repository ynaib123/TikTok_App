-- TikTok native sounds library (Lot 5 / Audio step — music tab).
-- Stores curated + user-imported sounds from TikTok's licensed music catalogue.
-- Refreshed nightly via TikTok Research API (when configured) or kept as a
-- manually curated set. Sound IDs are passed to the TikTok Content Posting API
-- in the music_info.music_id field at publish time.

CREATE TABLE IF NOT EXISTS tiktok_sounds (
    id              BIGSERIAL       PRIMARY KEY,
    sound_id        VARCHAR(64)     NOT NULL UNIQUE,
    title           VARCHAR(512)    NOT NULL,
    author_name     VARCHAR(255)    NOT NULL DEFAULT '',
    duration_ms     INTEGER,
    cover_url       TEXT,
    play_url        TEXT,
    video_count     BIGINT,
    trending        BOOLEAN         NOT NULL DEFAULT false,
    category        VARCHAR(64),
    source          VARCHAR(32)     NOT NULL DEFAULT 'manual',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    refreshed_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CHECK (source IN ('manual', 'research_api', 'import_url'))
);

CREATE INDEX IF NOT EXISTS idx_tiktok_sounds_category  ON tiktok_sounds(category);
CREATE INDEX IF NOT EXISTS idx_tiktok_sounds_trending  ON tiktok_sounds(trending) WHERE trending = true;
CREATE INDEX IF NOT EXISTS idx_tiktok_sounds_refreshed ON tiktok_sounds(refreshed_at);

COMMENT ON TABLE  tiktok_sounds IS 'TikTok native sounds library — sound_id passed to TikTok publish API at upload time.';
COMMENT ON COLUMN tiktok_sounds.sound_id   IS 'TikTok music_id used in Content Posting API music_info.music_id field.';
COMMENT ON COLUMN tiktok_sounds.play_url   IS 'Preview URL when available (Research API). NULL for manually curated entries.';
COMMENT ON COLUMN tiktok_sounds.video_count IS 'Number of TikTok videos using this sound — popularity indicator.';
COMMENT ON COLUMN tiktok_sounds.source     IS 'manual=admin-seeded | research_api=nightly refresh | import_url=user-imported via video URL.';

-- Convert legacy Postgres Large Object (oid) columns to plain TEXT.
-- The oid mapping required @Lob fetches inside an active transaction; TEXT
-- works in autocommit mode and matches what the entities actually store
-- (JSON-as-string).

DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'video_workflow_runs' AND column_name = 'request_payload';
    IF col_type = 'oid' THEN
        ALTER TABLE video_workflow_runs ADD COLUMN request_payload_text text;
        UPDATE video_workflow_runs
            SET request_payload_text = convert_from(lo_get(request_payload), 'UTF8')
            WHERE request_payload IS NOT NULL;
        ALTER TABLE video_workflow_runs DROP COLUMN request_payload;
        ALTER TABLE video_workflow_runs RENAME COLUMN request_payload_text TO request_payload;
    END IF;

    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'video_workflow_runs' AND column_name = 'response_payload';
    IF col_type = 'oid' THEN
        ALTER TABLE video_workflow_runs ADD COLUMN response_payload_text text;
        UPDATE video_workflow_runs
            SET response_payload_text = convert_from(lo_get(response_payload), 'UTF8')
            WHERE response_payload IS NOT NULL;
        ALTER TABLE video_workflow_runs DROP COLUMN response_payload;
        ALTER TABLE video_workflow_runs RENAME COLUMN response_payload_text TO response_payload;
    END IF;

    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'video_pipeline_events' AND column_name = 'payload_json';
    IF col_type = 'oid' THEN
        ALTER TABLE video_pipeline_events ADD COLUMN payload_json_text text;
        UPDATE video_pipeline_events
            SET payload_json_text = convert_from(lo_get(payload_json), 'UTF8')
            WHERE payload_json IS NOT NULL;
        ALTER TABLE video_pipeline_events DROP COLUMN payload_json;
        ALTER TABLE video_pipeline_events RENAME COLUMN payload_json_text TO payload_json;
    END IF;
END $$;

-- Best-effort cleanup of orphaned large objects no longer referenced.
SELECT lo_unlink(loid) FROM (
    SELECT pg_largeobject_metadata.oid AS loid
    FROM pg_largeobject_metadata
    WHERE NOT EXISTS (
        SELECT 1 FROM video_workflow_runs r
            WHERE pg_largeobject_metadata.oid IN (COALESCE(NULL, 0))
    )
) orphaned WHERE false; -- guarded; manual cleanup if needed

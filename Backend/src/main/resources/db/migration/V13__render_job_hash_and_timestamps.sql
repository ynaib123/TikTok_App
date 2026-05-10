-- Lot 3 — Contrats stricts : hash de payload pour l'idempotence et horodatages séparés.
--
-- request_hash : SHA-256 hex des champs significatifs du render job (template, médias,
--   styles, audio). Deux relances avec le même hash reutilisent le run ou sont refusées.
-- accepted_at  : moment où le run a été accepté par le backend (≠ started/completed).
-- started_at   : moment où le rendu a effectivement démarré côté RenderVideo.
-- payload_version : version du contrat render utilisé pour ce run.

ALTER TABLE video_workflow_runs
    ADD COLUMN IF NOT EXISTS request_hash     varchar(64),
    ADD COLUMN IF NOT EXISTS payload_version  varchar(20),
    ADD COLUMN IF NOT EXISTS accepted_at      timestamp with time zone,
    ADD COLUMN IF NOT EXISTS started_at       timestamp with time zone;

-- Index pour chercher rapidement si un hash identique existe encore dans la fenêtre d'idempotence.
CREATE INDEX IF NOT EXISTS idx_video_workflow_runs_request_hash
    ON video_workflow_runs (request_hash)
    WHERE request_hash IS NOT NULL;

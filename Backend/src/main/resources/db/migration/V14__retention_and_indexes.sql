-- Lot 7 — Observabilité : indexes pour les requêtes dashboard + politique de rétention.

-- Indexes manquants pour les requêtes fréquentes sur video_workflow_runs
CREATE INDEX IF NOT EXISTS idx_vwr_status_type_created
    ON video_workflow_runs (status, workflow_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vwr_content_idea_type
    ON video_workflow_runs (content_idea_id, workflow_type, created_at DESC);

-- Indexes sur content_ideas pour le dashboard (filtre par statut, catégorie, date)
CREATE INDEX IF NOT EXISTS idx_ci_pipeline_status_created
    ON content_ideas (pipeline_status, created_at DESC)
    WHERE pipeline_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ci_category_created
    ON content_ideas (category, created_at DESC)
    WHERE category IS NOT NULL;

-- Politique de rétention : fonction + job planifié (via pg_cron ou appel applicatif).
-- Cette migration crée la fonction ; l'appel peut être fait manuellement ou via un
-- @Scheduled Spring Boot au démarrage du service de maintenance.
CREATE OR REPLACE FUNCTION purge_old_workflow_runs(retention_days integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM video_workflow_runs
    WHERE created_at < NOW() - (retention_days || ' days')::interval
      AND status IN ('SUCCEEDED', 'FAILED', 'CANCELLED')
      AND workflow_type NOT IN ('RENDER_TEMPLATE_VIDEO', 'INIT_PUBLISH_TIKTOK');
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Index pour pipeline_events si la table existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_events') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pipeline_events_idea_created
                 ON pipeline_events (content_idea_id, created_at DESC)';
    END IF;
END $$;

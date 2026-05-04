package com.tiktokapp.backend.config;

import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoWorkflowType;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class VideoOpsSchemaMigration {

    private static final Logger logger = LoggerFactory.getLogger(VideoOpsSchemaMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public VideoOpsSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    void migrateEnumCheckConstraints() {
        ensureContentIdeasSchema();
        ensureTikTokAccountsSchema();
        ensureServiceConnectionsProfilesSchema();
        ensureAlertCooldownSchema();
        ensureBatchPublishSchema();
        synchronizeCheckConstraint(
                "video_pipeline_states",
                "video_pipeline_states_pipeline_stage_check",
                "pipeline_stage",
                Arrays.stream(VideoPipelineStage.values()).map(Enum::name).toList()
        );
        synchronizeCheckConstraint(
                "video_pipeline_states",
                "video_pipeline_states_last_workflow_type_check",
                "last_workflow_type",
                Arrays.stream(VideoWorkflowType.values()).map(Enum::name).toList(),
                true
        );
    }

    private void synchronizeCheckConstraint(String tableName, String constraintName, String columnName, java.util.List<String> allowedValues) {
        synchronizeCheckConstraint(tableName, constraintName, columnName, allowedValues, false);
    }

    private void synchronizeCheckConstraint(String tableName, String constraintName, String columnName, java.util.List<String> allowedValues, boolean nullable) {
        String valuesSql = allowedValues.stream()
                .map(value -> "'" + value.replace("'", "''") + "'")
                .collect(Collectors.joining(", "));
        String predicate = nullable
                ? columnName + " IS NULL OR " + columnName + " IN (" + valuesSql + ")"
                : columnName + " IN (" + valuesSql + ")";

        jdbcTemplate.execute("ALTER TABLE " + tableName + " DROP CONSTRAINT IF EXISTS " + constraintName);
        jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD CONSTRAINT " + constraintName + " CHECK (" + predicate + ")");
        logger.info("video_ops schema constraint {} synchronized on {}", constraintName, tableName);
    }

    private void ensureContentIdeasSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS content_ideas (
                    id                      bigserial PRIMARY KEY,
                    category                text,
                    topic                   text,
                    scripts                 text,
                    script_status           text,
                    caption                 text,
                    background_keyword      text,
                    status                  text,
                    pipeline_status         text,
                    publish_status          text,
                    platform                text,
                    final_video_status      text,
                    shotstack_status        text,
                    shotstack_url           text,
                    shotstack_render_id     text,
                    render_payload          text,
                    render_status           text,
                    tiktok_account_open_id  text,
                    template_id             text,
                    tiktok_publish_id       text,
                    tiktok_upload_url       text,
                    tiktok_upload_status    text,
                    tiktok_check_status     text,
                    uploaded_at             timestamp with time zone,
                    published_at            timestamp with time zone,
                    created_at              timestamp with time zone NOT NULL DEFAULT now(),
                    updated_at              timestamp with time zone NOT NULL DEFAULT now()
                )
                """);
        logger.info("video_ops schema content_ideas ensured");
    }

    private void ensureTikTokAccountsSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS tiktok_accounts (
                    id                       bigserial PRIMARY KEY,
                    open_id                  text,
                    access_token             text,
                    refresh_token            text,
                    scope                    text,
                    token_type               text,
                    token_status             varchar(32) NOT NULL DEFAULT 'ACTIVE',
                    access_token_expires_at  timestamp with time zone,
                    refresh_token_expires_at timestamp with time zone,
                    last_token_refresh_at    timestamp with time zone,
                    last_token_refresh_error text,
                    created_at               timestamp with time zone NOT NULL DEFAULT now(),
                    updated_at               timestamp with time zone NOT NULL DEFAULT now()
                )
                """);
        jdbcTemplate.execute("ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS token_status varchar(32) NOT NULL DEFAULT 'ACTIVE'");
        jdbcTemplate.execute("ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS access_token_expires_at timestamp with time zone");
        jdbcTemplate.execute("ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamp with time zone");
        jdbcTemplate.execute("ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS last_token_refresh_at timestamp with time zone");
        jdbcTemplate.execute("ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS last_token_refresh_error text");
        jdbcTemplate.execute("UPDATE tiktok_accounts SET token_status = 'ACTIVE' WHERE token_status IS NULL");
        logger.info("video_ops schema tiktok_accounts ensured");
    }

    private void ensureServiceConnectionsProfilesSchema() {
        jdbcTemplate.execute("ALTER TABLE service_connections ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false");
        jdbcTemplate.execute("ALTER TABLE service_connections ADD COLUMN IF NOT EXISTS last_validation_status varchar(24)");
        jdbcTemplate.execute("ALTER TABLE service_connections ADD COLUMN IF NOT EXISTS last_validation_message varchar(500)");
        convertServiceConnectionLargeObjectColumnToText("secret_value");
        convertServiceConnectionLargeObjectColumnToText("metadata_json");
        jdbcTemplate.execute("UPDATE service_connections SET is_active = true WHERE is_active IS NULL");
        jdbcTemplate.execute("UPDATE service_connections SET last_validation_status = 'UNKNOWN' WHERE last_validation_status IS NULL");
        jdbcTemplate.execute("""
                UPDATE service_connections sc
                   SET is_active = true
                 WHERE sc.id IN (
                        SELECT MAX(candidate.id)
                          FROM service_connections candidate
                         WHERE NOT EXISTS (
                                SELECT 1
                                  FROM service_connections active_sc
                                 WHERE active_sc.provider_key = candidate.provider_key
                                   AND active_sc.is_active = true
                         )
                         GROUP BY candidate.provider_key
                 )
                """);

        List<String> uniqueConstraints = jdbcTemplate.queryForList("""
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_name = kcu.table_name
                WHERE tc.table_name = 'service_connections'
                  AND tc.constraint_type = 'UNIQUE'
                  AND kcu.column_name = 'provider_key'
                """, String.class);
        uniqueConstraints.forEach(constraintName ->
                jdbcTemplate.execute("ALTER TABLE service_connections DROP CONSTRAINT IF EXISTS " + constraintName)
        );
    }

    private void ensureAlertCooldownSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS alert_cooldown (
                    id              bigserial PRIMARY KEY,
                    alert_key       varchar(255) NOT NULL UNIQUE,
                    last_sent_at    timestamp with time zone NOT NULL,
                    alert_count     integer NOT NULL DEFAULT 1,
                    last_error_hash varchar(64),
                    created_at      timestamp with time zone NOT NULL DEFAULT now()
                )
                """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_alert_cooldown_last_sent_at ON alert_cooldown(last_sent_at)");
        logger.info("video_ops schema alert_cooldown ensured");
    }

    private void ensureBatchPublishSchema() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS video_publish_batches (
                    id                       varchar(36) PRIMARY KEY,
                    requested_by_email       varchar(190),
                    tiktok_account_open_id   varchar(190),
                    total_count              integer NOT NULL,
                    completed_count          integer NOT NULL DEFAULT 0,
                    failed_count             integer NOT NULL DEFAULT 0,
                    status                   varchar(24) NOT NULL DEFAULT 'RUNNING',
                    created_at               timestamp with time zone NOT NULL DEFAULT now(),
                    updated_at               timestamp with time zone NOT NULL DEFAULT now(),
                    completed_at             timestamp with time zone
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS video_publish_batch_items (
                    id                bigserial PRIMARY KEY,
                    batch_id          varchar(36) NOT NULL REFERENCES video_publish_batches(id) ON DELETE CASCADE,
                    content_idea_id   bigint NOT NULL,
                    status            varchar(24) NOT NULL DEFAULT 'PENDING',
                    attempt_number    integer NOT NULL DEFAULT 1,
                    error_message     varchar(1000),
                    workflow_run_id   bigint,
                    created_at        timestamp with time zone NOT NULL DEFAULT now(),
                    updated_at        timestamp with time zone NOT NULL DEFAULT now(),
                    completed_at      timestamp with time zone,
                    UNIQUE (batch_id, content_idea_id)
                )
                """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON video_publish_batch_items(batch_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_batch_items_status ON video_publish_batch_items(status)");
        logger.info("video_ops schema video_publish_batches ensured");
    }

    private void convertServiceConnectionLargeObjectColumnToText(String columnName) {
        String dataType;
        try {
            dataType = jdbcTemplate.query("""
                    SELECT c.udt_name
                      FROM information_schema.columns c
                     WHERE c.table_name = 'service_connections'
                       AND c.column_name = ?
                    """, ps -> ps.setString(1, columnName), rs -> rs.next() ? rs.getString(1) : null);
        } catch (Exception exception) {
            logger.debug("video_ops schema could not inspect column type for {} and skipped oid conversion", columnName, exception);
            return;
        }

        if (!"oid".equalsIgnoreCase(String.valueOf(dataType))) {
            return;
        }

        jdbcTemplate.execute("""
                ALTER TABLE service_connections
                ALTER COLUMN %s TYPE text
                USING CASE
                    WHEN %s IS NULL THEN NULL
                    ELSE convert_from(lo_get(%s), 'UTF8')
                END
                """.formatted(columnName, columnName, columnName));
        logger.info("video_ops schema column {} converted from oid to text", columnName);
    }
}

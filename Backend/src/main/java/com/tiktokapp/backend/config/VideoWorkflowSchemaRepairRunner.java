package com.tiktokapp.backend.config;

import com.tiktokapp.backend.model.VideoWorkflowType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Arrays;
import java.util.stream.Collectors;

@Component
public class VideoWorkflowSchemaRepairRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(VideoWorkflowSchemaRepairRunner.class);
    private static final String RUNS_TABLE_NAME = "video_workflow_runs";
    private static final String RUNS_CONSTRAINT_NAME = "video_workflow_runs_workflow_type_check";
    private static final String PIPELINE_STATES_TABLE_NAME = "video_pipeline_states";
    private static final String PIPELINE_STATES_CONSTRAINT_NAME = "video_pipeline_states_last_workflow_type_check";

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public VideoWorkflowSchemaRepairRunner(JdbcTemplate jdbcTemplate, DataSource dataSource) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            String databaseProduct = connection.getMetaData().getDatabaseProductName();
            if (!"PostgreSQL".equalsIgnoreCase(databaseProduct)) {
                return;
            }
        }

        String allowedValues = Arrays.stream(VideoWorkflowType.values())
                .map(VideoWorkflowType::name)
                .map(value -> "'" + value + "'")
                .collect(Collectors.joining(", "));

        repairRunsConstraint(allowedValues);
        repairPipelineStatesConstraint(allowedValues);
        logger.info("Video workflow schema repaired for workflow type constraints with values {}", allowedValues);
    }

    private void repairRunsConstraint(String allowedValues) {
        if (!tableExists(RUNS_TABLE_NAME)) {
            return;
        }

        dropConstraintIfExists(RUNS_TABLE_NAME, RUNS_CONSTRAINT_NAME);
        jdbcTemplate.execute("""
                ALTER TABLE %s
                ADD CONSTRAINT %s
                CHECK (workflow_type IN (%s));
                """.formatted(RUNS_TABLE_NAME, RUNS_CONSTRAINT_NAME, allowedValues));
    }

    private void repairPipelineStatesConstraint(String allowedValues) {
        if (!tableExists(PIPELINE_STATES_TABLE_NAME)) {
            return;
        }

        dropConstraintIfExists(PIPELINE_STATES_TABLE_NAME, PIPELINE_STATES_CONSTRAINT_NAME);
        jdbcTemplate.execute("""
                ALTER TABLE %s
                ADD CONSTRAINT %s
                CHECK (last_workflow_type IS NULL OR last_workflow_type IN (%s));
                """.formatted(PIPELINE_STATES_TABLE_NAME, PIPELINE_STATES_CONSTRAINT_NAME, allowedValues));
    }

    private boolean tableExists(String tableName) {
        Integer tableExists = jdbcTemplate.queryForObject(
                "select count(*) from information_schema.tables where table_name = ?",
                Integer.class,
                tableName
        );
        return tableExists != null && tableExists > 0;
    }

    private void dropConstraintIfExists(String tableName, String constraintName) {
        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints
                        WHERE constraint_name = '%s'
                          AND table_name = '%s'
                    ) THEN
                        ALTER TABLE %s DROP CONSTRAINT %s;
                    END IF;
                END $$;
                """.formatted(constraintName, tableName, tableName, constraintName));
    }
}

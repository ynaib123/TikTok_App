package com.tiktokapp.backend.config;

import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoWorkflowType;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
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
}

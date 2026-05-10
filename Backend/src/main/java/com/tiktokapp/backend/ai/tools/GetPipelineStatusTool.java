package com.tiktokapp.backend.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.AgentExecutionContext;
import com.tiktokapp.backend.ai.AgentTool;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Etat d'avancement d'une idée dans le pipeline (stage, dernier run, dernier
 * événement). Permet au Supervisor de répondre "où en est ma vidéo ?".
 */
@Component
public class GetPipelineStatusTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public GetPipelineStatusTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "get_pipeline_status"; }
    @Override public String description() {
        return "Retourne l'etat pipeline d'une idee : stage actuel, dernier workflow run, dernier evenement. Read-only.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode id = props.putObject("content_idea_id");
        id.put("type", "integer");
        id.put("description", "ID de l'idee.");
        ArrayNode required = schema.putArray("required");
        required.add("content_idea_id");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        long ideaId = input.path("content_idea_id").asLong();
        if (ideaId <= 0) throw new IllegalArgumentException("content_idea_id invalide.");

        ObjectNode result = objectMapper.createObjectNode();
        result.put("content_idea_id", ideaId);

        // Stage actuel via video_pipeline_states (1 ligne par idea, mise a jour par trackingService).
        List<Map<String, Object>> states = jdbcTemplate.queryForList(
                "SELECT pipeline_stage, last_workflow_type, last_workflow_run_id, last_error_message, updated_at "
                        + "FROM video_pipeline_states WHERE content_idea_id = ?",
                ideaId
        );
        if (states.isEmpty()) {
            result.put("stage", "UNKNOWN");
            result.put("note", "Aucun etat pipeline enregistre pour cette idee.");
        } else {
            Map<String, Object> state = states.get(0);
            result.put("stage", String.valueOf(state.get("pipeline_stage")));
            result.put("last_workflow_type", state.get("last_workflow_type") == null ? null : String.valueOf(state.get("last_workflow_type")));
            result.put("last_workflow_run_id", state.get("last_workflow_run_id") == null ? null : ((Number) state.get("last_workflow_run_id")).longValue());
            result.put("last_error", state.get("last_error_message") == null ? null : String.valueOf(state.get("last_error_message")));
            result.put("updated_at", String.valueOf(state.get("updated_at")));
        }

        // Dernier run en cours ou recent.
        List<Map<String, Object>> runs = jdbcTemplate.queryForList(
                "SELECT id, workflow_type, status, started_at, completed_at, error_message "
                        + "FROM video_workflow_runs WHERE content_idea_id = ? "
                        + "ORDER BY started_at DESC LIMIT 1",
                ideaId
        );
        if (!runs.isEmpty()) {
            Map<String, Object> run = runs.get(0);
            ObjectNode lastRun = result.putObject("last_run");
            lastRun.put("id", ((Number) run.get("id")).longValue());
            lastRun.put("workflow_type", String.valueOf(run.get("workflow_type")));
            lastRun.put("status", String.valueOf(run.get("status")));
            lastRun.put("started_at", String.valueOf(run.get("started_at")));
            lastRun.put("completed_at", run.get("completed_at") == null ? null : String.valueOf(run.get("completed_at")));
            lastRun.put("error", run.get("error_message") == null ? null : String.valueOf(run.get("error_message")));
        }

        // Dernier event observability.
        List<Map<String, Object>> events = jdbcTemplate.queryForList(
                "SELECT severity, event_type, message, created_at "
                        + "FROM video_pipeline_events WHERE content_idea_id = ? "
                        + "ORDER BY created_at DESC LIMIT 1",
                ideaId
        );
        if (!events.isEmpty()) {
            Map<String, Object> event = events.get(0);
            ObjectNode lastEvent = result.putObject("last_event");
            lastEvent.put("severity", String.valueOf(event.get("severity")));
            lastEvent.put("event_type", String.valueOf(event.get("event_type")));
            lastEvent.put("message", String.valueOf(event.get("message")));
            lastEvent.put("created_at", String.valueOf(event.get("created_at")));
        }

        return result;
    }
}

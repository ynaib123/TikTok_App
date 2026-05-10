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

/** Détail d'une idée + ses 5 derniers workflow runs. */
@Component
public class GetIdeaDetailTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public GetIdeaDetailTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "get_idea_detail"; }
    @Override public String description() {
        return "Renvoie le détail complet d'une content idea (script, caption, urls) + ses 5 derniers workflow runs. Read-only.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode id = props.putObject("content_idea_id");
        id.put("type", "integer");
        id.put("description", "ID de la content idea.");
        ArrayNode required = schema.putArray("required");
        required.add("content_idea_id");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        long ideaId = input.path("content_idea_id").asLong();
        if (ideaId <= 0) throw new IllegalArgumentException("content_idea_id invalide.");

        List<Map<String, Object>> ideas = jdbcTemplate.queryForList(
                "SELECT id, topic, category, scripts, caption, keyword, "
                        + "COALESCE(publish_status, 'draft') AS publish_status, "
                        + "shotstack_url, tiktok_upload_url, tiktok_account_open_id, "
                        + "created_at, updated_at "
                        + "FROM content_ideas WHERE id = ?",
                ideaId
        );
        if (ideas.isEmpty()) {
            ObjectNode err = objectMapper.createObjectNode();
            err.put("found", false);
            err.put("content_idea_id", ideaId);
            return err;
        }
        Map<String, Object> idea = ideas.get(0);
        ObjectNode result = objectMapper.createObjectNode();
        result.put("found", true);
        result.put("id", ((Number) idea.get("id")).longValue());
        result.put("topic", String.valueOf(idea.get("topic")));
        result.put("category", String.valueOf(idea.get("category")));
        result.put("publish_status", String.valueOf(idea.get("publish_status")));
        result.put("has_script", idea.get("scripts") != null && !String.valueOf(idea.get("scripts")).isBlank());
        result.put("caption", String.valueOf(idea.getOrDefault("caption", "")));
        result.put("keyword", String.valueOf(idea.getOrDefault("keyword", "")));
        result.put("shotstack_url", idea.get("shotstack_url") == null ? null : String.valueOf(idea.get("shotstack_url")));
        result.put("upload_url", idea.get("tiktok_upload_url") == null ? null : String.valueOf(idea.get("tiktok_upload_url")));
        result.put("tiktok_account_open_id", idea.get("tiktok_account_open_id") == null ? null : String.valueOf(idea.get("tiktok_account_open_id")));
        result.put("created_at", String.valueOf(idea.get("created_at")));

        List<Map<String, Object>> runs = jdbcTemplate.queryForList(
                "SELECT id, workflow_type, status, started_at, completed_at, error_message "
                        + "FROM video_workflow_runs WHERE content_idea_id = ? "
                        + "ORDER BY started_at DESC LIMIT 5",
                ideaId
        );
        ArrayNode runsArr = result.putArray("recent_runs");
        for (Map<String, Object> run : runs) {
            ObjectNode r = runsArr.addObject();
            r.put("run_id", ((Number) run.get("id")).longValue());
            r.put("workflow_type", String.valueOf(run.get("workflow_type")));
            r.put("status", String.valueOf(run.get("status")));
            r.put("started_at", String.valueOf(run.get("started_at")));
            r.put("completed_at", run.get("completed_at") == null ? null : String.valueOf(run.get("completed_at")));
            r.put("error", run.get("error_message") == null ? null : String.valueOf(run.get("error_message")));
        }
        return result;
    }
}

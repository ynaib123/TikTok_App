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
 * Liste les idées récentes — lecture seule, utilisée par le Supervisor pour
 * répondre à "qu'est-ce qu'on a en cours ?" depuis Telegram.
 */
@Component
public class ListRecentIdeasTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ListRecentIdeasTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "list_recent_ideas"; }

    @Override public String description() {
        return "Liste les content ideas récentes avec leur statut pipeline. Read-only.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode limit = props.putObject("limit");
        limit.put("type", "integer");
        limit.put("description", "Nombre d'idées à renvoyer (1–50). Défaut 10.");
        limit.put("minimum", 1);
        limit.put("maximum", 50);
        ObjectNode status = props.putObject("status_filter");
        status.put("type", "string");
        status.put("description", "Filtre optionnel sur publish_status (ex: 'draft', 'published', 'uploaded').");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        int limit = Math.max(1, Math.min(50, input.path("limit").asInt(10)));
        String statusFilter = input.path("status_filter").asText("").trim();

        List<Map<String, Object>> rows;
        if (statusFilter.isEmpty()) {
            rows = jdbcTemplate.queryForList(
                    "SELECT id, topic, category, COALESCE(publish_status, 'draft') AS publish_status, "
                            + "shotstack_url, tiktok_upload_url, created_at "
                            + "FROM content_ideas ORDER BY created_at DESC LIMIT ?",
                    limit
            );
        } else {
            rows = jdbcTemplate.queryForList(
                    "SELECT id, topic, category, COALESCE(publish_status, 'draft') AS publish_status, "
                            + "shotstack_url, tiktok_upload_url, created_at "
                            + "FROM content_ideas WHERE COALESCE(publish_status, 'draft') = ? "
                            + "ORDER BY created_at DESC LIMIT ?",
                    statusFilter, limit
            );
        }

        ArrayNode out = objectMapper.createArrayNode();
        for (Map<String, Object> row : rows) {
            ObjectNode item = out.addObject();
            item.put("id", ((Number) row.get("id")).longValue());
            item.put("topic", String.valueOf(row.get("topic")));
            item.put("category", String.valueOf(row.get("category")));
            item.put("publish_status", String.valueOf(row.get("publish_status")));
            item.put("has_video", row.get("shotstack_url") != null);
            item.put("has_upload_url", row.get("tiktok_upload_url") != null);
            item.put("created_at", String.valueOf(row.get("created_at")));
        }
        ObjectNode result = objectMapper.createObjectNode();
        result.put("count", out.size());
        result.set("ideas", out);
        return result;
    }
}

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
 * Returns content ideas that have a script but were never published.
 * Helps the strategist suggest which backlog item to work on next.
 */
@Component
public class GetPendingIdeasTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public GetPendingIdeasTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() { return "get_pending_ideas"; }

    @Override
    public String description() {
        return "Returns scripted but unpublished content ideas, sorted oldest first. Read-only.";
    }

    @Override
    public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode limit = props.putObject("limit");
        limit.put("type", "integer");
        limit.put("description", "How many ideas to return (1–50). Defaults to 10.");
        limit.put("minimum", 1);
        limit.put("maximum", 50);
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        int limit = Math.max(1, Math.min(50, input.path("limit").asInt(10)));
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, topic, category, COALESCE(publish_status, 'draft') AS publish_status, "
                        + "created_at "
                        + "FROM content_ideas "
                        + "WHERE scripts IS NOT NULL AND scripts <> '' "
                        + "AND COALESCE(publish_status, 'draft') NOT IN ('published','uploaded') "
                        + "ORDER BY created_at ASC LIMIT ?",
                limit
        );
        ArrayNode out = objectMapper.createArrayNode();
        for (Map<String, Object> row : rows) {
            ObjectNode item = out.addObject();
            item.put("id", ((Number) row.get("id")).longValue());
            item.put("topic", String.valueOf(row.get("topic")));
            item.put("category", String.valueOf(row.get("category")));
            item.put("publish_status", String.valueOf(row.get("publish_status")));
            item.put("created_at", String.valueOf(row.get("created_at")));
        }
        ObjectNode result = objectMapper.createObjectNode();
        result.put("limit", limit);
        result.set("ideas", out);
        return result;
    }
}

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
 * Read-only tool that ranks the most-published topics over the last
 * {@code days} window (default 30). Useful for the strategist agent to
 * identify themes that are already pulling weight on the account.
 */
@Component
public class ListTopTopicsTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ListTopTopicsTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() { return "list_top_topics"; }

    @Override
    public String description() {
        return "Returns the most published topics over the last N days, sorted by frequency.";
    }

    @Override
    public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode days = props.putObject("days");
        days.put("type", "integer");
        days.put("description", "Lookback window in days (1–365). Defaults to 30.");
        days.put("minimum", 1);
        days.put("maximum", 365);
        ObjectNode limit = props.putObject("limit");
        limit.put("type", "integer");
        limit.put("description", "How many rows to return (1–50). Defaults to 10.");
        limit.put("minimum", 1);
        limit.put("maximum", 50);
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        int days = clampInt(input.path("days").asInt(30), 1, 365);
        int limit = clampInt(input.path("limit").asInt(10), 1, 50);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT topic, COUNT(*) AS occurrences "
                        + "FROM content_ideas "
                        + "WHERE topic IS NOT NULL AND topic <> '' "
                        + "AND created_at >= now() - (? * interval '1 day') "
                        + "GROUP BY topic ORDER BY occurrences DESC LIMIT ?",
                days, limit
        );
        ArrayNode out = objectMapper.createArrayNode();
        for (Map<String, Object> row : rows) {
            ObjectNode item = out.addObject();
            item.put("topic", String.valueOf(row.get("topic")));
            Object count = row.get("occurrences");
            item.put("occurrences", count == null ? 0 : ((Number) count).longValue());
        }
        ObjectNode result = objectMapper.createObjectNode();
        result.put("days", days);
        result.put("limit", limit);
        result.set("topics", out);
        return result;
    }

    private static int clampInt(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}

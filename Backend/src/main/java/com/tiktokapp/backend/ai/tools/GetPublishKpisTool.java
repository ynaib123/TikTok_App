package com.tiktokapp.backend.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.AgentExecutionContext;
import com.tiktokapp.backend.ai.AgentTool;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Returns publish-pipeline KPIs : counts by status (draft, rendered, uploaded,
 * published, failed) over the last N days. Lets the strategist reason about
 * the operator's current backlog without spamming the DB.
 */
@Component
public class GetPublishKpisTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public GetPublishKpisTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() { return "get_publish_kpis"; }

    @Override
    public String description() {
        return "Returns publish-pipeline KPIs (counts by publish_status) over the last N days. Read-only.";
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
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        int days = Math.max(1, Math.min(365, input.path("days").asInt(30)));
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT COALESCE(publish_status, 'unknown') AS status, COUNT(*) AS count "
                        + "FROM content_ideas "
                        + "WHERE created_at >= now() - (? * interval '1 day') "
                        + "GROUP BY publish_status",
                days
        );

        Map<String, Long> counts = new HashMap<>();
        long total = 0;
        for (Map<String, Object> row : rows) {
            String status = String.valueOf(row.get("status"));
            long count = ((Number) row.get("count")).longValue();
            counts.put(status, count);
            total += count;
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("days", days);
        result.put("total", total);
        ObjectNode statusBreakdown = result.putObject("statuses");
        counts.forEach((statusName, occurrences) -> statusBreakdown.put(statusName, occurrences));
        return result;
    }
}

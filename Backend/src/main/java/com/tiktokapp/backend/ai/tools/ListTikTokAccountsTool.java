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

/** Comptes TikTok connectés disponibles pour publier — utile pour le Supervisor avant trigger_publish. */
@Component
public class ListTikTokAccountsTool implements AgentTool {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ListTikTokAccountsTool(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "list_tiktok_accounts"; }
    @Override public String description() {
        return "Liste les comptes TikTok connectés (open_id, nickname, scopes, environnement). Indispensable avant trigger_publish.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.putObject("properties");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        // Schema réel : pas de nickname/environment/status — uniquement token_status (ACTIVE/REVOKED…).
        // L'agent doit savoir si un compte est utilisable ; access_token_expires_at lui dit
        // implicitement si le token est encore frais.
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, open_id, scope, token_status, access_token_expires_at, created_at "
                        + "FROM tiktok_accounts WHERE token_status = 'ACTIVE' ORDER BY created_at DESC"
        );
        ArrayNode out = objectMapper.createArrayNode();
        for (Map<String, Object> row : rows) {
            ObjectNode item = out.addObject();
            item.put("id", ((Number) row.get("id")).longValue());
            item.put("open_id", String.valueOf(row.get("open_id")));
            item.put("scope", String.valueOf(row.getOrDefault("scope", "")));
            item.put("token_status", String.valueOf(row.get("token_status")));
            item.put("token_expires_at", row.get("access_token_expires_at") == null ? null : String.valueOf(row.get("access_token_expires_at")));
        }
        ObjectNode result = objectMapper.createObjectNode();
        result.put("count", out.size());
        result.set("accounts", out);
        return result;
    }
}

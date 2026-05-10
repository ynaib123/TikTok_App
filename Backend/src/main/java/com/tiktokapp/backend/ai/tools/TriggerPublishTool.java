package com.tiktokapp.backend.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.AgentExecutionContext;
import com.tiktokapp.backend.ai.AgentTool;
import com.tiktokapp.backend.dto.videoops.VideoWorkflowActionResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoWorkflowType;
import com.tiktokapp.backend.service.videoops.WorkflowOrchestrator;
import org.springframework.stereotype.Component;

/**
 * Initialise la publication TikTok pour une vidéo déjà rendue. Le workflow n8n
 * obtient un upload_url depuis TikTok, le push de la vidéo elle-même se fait
 * ensuite via un autre workflow déclenché par l'opérateur (TIKTOK_UPLOAD).
 *
 * <p>SAFETY : exige une confirmation explicite de l'utilisateur (`confirmed=true`)
 * pour eviter qu'un agent autonome publie sans validation humaine. Le system
 * prompt du Supervisor doit demander confirmation avant d'appeler ce tool.
 */
@Component
public class TriggerPublishTool implements AgentTool {

    private final WorkflowOrchestrator workflowOrchestrator;
    private final ObjectMapper objectMapper;

    public TriggerPublishTool(WorkflowOrchestrator workflowOrchestrator, ObjectMapper objectMapper) {
        this.workflowOrchestrator = workflowOrchestrator;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "trigger_publish"; }
    @Override public String description() {
        return "Initialise la publication TikTok (init-publish-tiktok) — recupere un upload_url. "
                + "Inputs : content_idea_id, tiktok_account_open_id (cf list_tiktok_accounts), confirmed=true (safety). "
                + "Refuse si confirmed != true. Async — l'upload binaire a lieu apres.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode id = props.putObject("content_idea_id");
        id.put("type", "integer");
        id.put("description", "ID de l'idee.");
        ObjectNode openId = props.putObject("tiktok_account_open_id");
        openId.put("type", "string");
        openId.put("description", "open_id du compte TikTok cible. Doit avoir scope video.publish.");
        ObjectNode confirmed = props.putObject("confirmed");
        confirmed.put("type", "boolean");
        confirmed.put("description", "Doit etre true. Safety net : l'agent demande confirmation a l'utilisateur d'abord.");
        ArrayNode required = schema.putArray("required");
        required.add("content_idea_id");
        required.add("tiktok_account_open_id");
        required.add("confirmed");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        if (!input.path("confirmed").asBoolean(false)) {
            ObjectNode refused = objectMapper.createObjectNode();
            refused.put("ok", false);
            refused.put("error", "Publication refusee : champ confirmed=true obligatoire. Demande la validation a l'utilisateur avant de relancer.");
            return refused;
        }
        long ideaId = input.path("content_idea_id").asLong();
        if (ideaId <= 0) throw new IllegalArgumentException("content_idea_id invalide.");
        String openId = input.path("tiktok_account_open_id").asText("").trim();
        if (openId.isEmpty()) throw new IllegalArgumentException("tiktok_account_open_id obligatoire.");

        WorkflowTriggerRequest req = new WorkflowTriggerRequest();
        req.setContentIdeaId(ideaId);
        req.setTiktokAccountOpenId(openId);
        req.setForce(false);
        req.setSource("agent-supervisor-publish");

        VideoWorkflowActionResponse response = workflowOrchestrator.triggerWorkflow(
                VideoWorkflowType.INIT_PUBLISH_TIKTOK,
                ideaId,
                req,
                context.adminEmail(),
                VideoPipelineStage.UPLOAD_PREPARING
        );

        ObjectNode out = objectMapper.createObjectNode();
        out.put("ok", true);
        out.put("message", "Publication TikTok initialisee. Upload binaire a suivre.");
        out.put("workflow_run_id", response.getRunId());
        out.put("content_idea_id", response.getContentIdeaId());
        out.put("status", response.getStatus());
        out.put("idempotent", response.isReused());
        return out;
    }
}

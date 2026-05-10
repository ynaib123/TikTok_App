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
 * Lance le pipeline de génération idée + script (équivalent du bouton "Générer"
 * de l'étape 1 du wizard). Crée une idée de zéro à partir d'une catégorie.
 */
@Component
public class TriggerMainPipelineTool implements AgentTool {

    private final WorkflowOrchestrator workflowOrchestrator;
    private final ObjectMapper objectMapper;

    public TriggerMainPipelineTool(WorkflowOrchestrator workflowOrchestrator, ObjectMapper objectMapper) {
        this.workflowOrchestrator = workflowOrchestrator;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "trigger_main_pipeline"; }
    @Override public String description() {
        return "Lance la generation d'idee + script via le pipeline principal n8n. "
                + "Inputs : category (Food/Love/Sport/Fitness/Beauty), language (Francais/English/...), "
                + "scene_count (1-10), topic optionnel, tiktok_account_open_id pour cibler un compte. "
                + "Retourne le runId du workflow accepté par n8n. Async : utiliser get_pipeline_status pour suivre.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        addStringProp(props, "category", "Categorie de contenu (Food, Love, Sport, Fitness, Beauty…). Obligatoire.");
        addStringProp(props, "language", "Langue cible (Francais, English, Espanol, Italiano, Deutsch, Arabe, Darija marocaine). Defaut Francais.");
        addStringProp(props, "topic", "Topic libre optionnel — si absent l'IA en cree un.");
        ObjectNode sceneCount = props.putObject("scene_count");
        sceneCount.put("type", "integer");
        sceneCount.put("description", "Nombre de scenes (1-10). Defaut 1.");
        sceneCount.put("minimum", 1);
        sceneCount.put("maximum", 10);
        addStringProp(props, "tiktok_account_open_id", "open_id du compte TikTok cible (cf. list_tiktok_accounts).");
        ArrayNode required = schema.putArray("required");
        required.add("category");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        String category = required(input, "category");

        WorkflowTriggerRequest req = new WorkflowTriggerRequest();
        req.setCategory(category);
        req.setIdeaCount(1);
        req.setForce(false);
        if (input.hasNonNull("topic")) req.setTopic(input.path("topic").asText());
        if (input.hasNonNull("language")) req.setLanguage(input.path("language").asText());
        if (input.hasNonNull("scene_count")) req.setSceneCount(input.path("scene_count").asInt());
        if (input.hasNonNull("tiktok_account_open_id")) req.setTiktokAccountOpenId(input.path("tiktok_account_open_id").asText());
        req.setSource("agent-supervisor-" + (context.agentId() == null ? "unknown" : context.agentId()));

        VideoWorkflowActionResponse response = workflowOrchestrator.triggerWorkflow(
                VideoWorkflowType.MAIN_PIPELINE,
                null,
                req,
                context.adminEmail(),
                VideoPipelineStage.CREATION_REQUESTED
        );

        return toResultNode(response, "Generation idee+script demandee. Le pipeline n8n tourne en async.");
    }

    private void addStringProp(ObjectNode props, String name, String desc) {
        ObjectNode p = props.putObject(name);
        p.put("type", "string");
        p.put("description", desc);
    }

    private String required(JsonNode input, String key) {
        String value = input.path(key).asText("").trim();
        if (value.isEmpty()) throw new IllegalArgumentException("Champ obligatoire: " + key);
        return value;
    }

    private JsonNode toResultNode(VideoWorkflowActionResponse response, String message) {
        ObjectNode out = objectMapper.createObjectNode();
        out.put("ok", true);
        out.put("message", message);
        if (response != null) {
            out.put("workflow_run_id", response.getRunId());
            out.put("content_idea_id", response.getContentIdeaId());
            out.put("workflow_type", response.getWorkflowType());
            out.put("status", response.getStatus());
            out.put("idempotent", response.isReused());
        }
        return out;
    }
}

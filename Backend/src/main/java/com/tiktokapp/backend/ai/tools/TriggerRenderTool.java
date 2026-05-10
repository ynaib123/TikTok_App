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
 * Lance le rendu video Remotion pour une idée déjà scriptée. Equivalent du
 * bouton "Générer la vidéo" du wizard. Idée doit avoir un script.
 */
@Component
public class TriggerRenderTool implements AgentTool {

    private final WorkflowOrchestrator workflowOrchestrator;
    private final ObjectMapper objectMapper;

    public TriggerRenderTool(WorkflowOrchestrator workflowOrchestrator, ObjectMapper objectMapper) {
        this.workflowOrchestrator = workflowOrchestrator;
        this.objectMapper = objectMapper;
    }

    @Override public String name() { return "trigger_render"; }
    @Override public String description() {
        return "Lance le rendu video Remotion pour une idee deja scriptee. "
                + "Inputs : content_idea_id (obligatoire), template_id (tiktok-pro-vertical / tiktok-bold-story / "
                + "tiktok-clean-minimal / tiktok-scene-sequence), quality_profile (fast/standard/premium). "
                + "Async — utilise get_pipeline_status pour suivre la progression.";
    }

    @Override public JsonNode inputSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        ObjectNode id = props.putObject("content_idea_id");
        id.put("type", "integer");
        id.put("description", "ID de l'idee a rendre.");
        ObjectNode template = props.putObject("template_id");
        template.put("type", "string");
        template.put("description", "Template Remotion. Defaut tiktok-scene-sequence.");
        ObjectNode quality = props.putObject("quality_profile");
        quality.put("type", "string");
        quality.put("description", "Profil qualite : fast | standard | premium. Defaut standard.");
        ArrayNode required = schema.putArray("required");
        required.add("content_idea_id");
        return schema;
    }

    @Override public JsonNode execute(JsonNode input, AgentExecutionContext context) {
        long ideaId = input.path("content_idea_id").asLong();
        if (ideaId <= 0) throw new IllegalArgumentException("content_idea_id invalide.");

        WorkflowTriggerRequest req = new WorkflowTriggerRequest();
        req.setContentIdeaId(ideaId);
        req.setForce(false);
        req.setTemplateId(input.path("template_id").asText("tiktok-scene-sequence"));
        if (input.hasNonNull("quality_profile")) req.setQualityProfile(input.path("quality_profile").asText());
        req.setSource("agent-supervisor-render");

        VideoWorkflowActionResponse response = workflowOrchestrator.triggerWorkflow(
                VideoWorkflowType.RENDER_TEMPLATE_VIDEO,
                ideaId,
                req,
                context.adminEmail(),
                VideoPipelineStage.RENDERING_REQUESTED
        );

        ObjectNode out = objectMapper.createObjectNode();
        out.put("ok", true);
        out.put("message", "Rendu video lance.");
        out.put("workflow_run_id", response.getRunId());
        out.put("content_idea_id", response.getContentIdeaId());
        out.put("status", response.getStatus());
        out.put("idempotent", response.isReused());
        return out;
    }
}

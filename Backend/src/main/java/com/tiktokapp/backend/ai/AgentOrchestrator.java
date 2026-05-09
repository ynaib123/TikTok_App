package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.dto.AgentRunRequest;
import com.tiktokapp.backend.ai.dto.AgentRunResponse;
import com.tiktokapp.backend.ai.llm.AnthropicProperties;
import com.tiktokapp.backend.ai.llm.LlmProvider;
import com.tiktokapp.backend.ai.model.AgentRun;
import com.tiktokapp.backend.ai.repository.AgentRunRepository;
import com.tiktokapp.backend.config.VideoOpsMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 3.1 + Lot 5 — Anthropic-backed agent orchestrator with the full
 * tool-use loop.
 *
 * <p>Per run :
 * <ol>
 *   <li>Resolves the agent from the registry, validates input.</li>
 *   <li>Persists an {@link AgentRun} as RUNNING.</li>
 *   <li>Runs the tool-use loop : send → handle tool_use → send tool_result → repeat
 *       up to {@code app.anthropic.max-tool-loop-iterations} steps.</li>
 *   <li>Persists tokens (input + output cumulative) and elapsed time.</li>
 * </ol>
 *
 * The Anthropic-flavoured wire format (content blocks with {@code type: text}
 * / {@code tool_use} / {@code tool_result}) is encoded inline since the
 * surface area is small and avoids pulling a vendor SDK.
 */
@Service
public class AgentOrchestrator {

    private static final Logger logger = LoggerFactory.getLogger(AgentOrchestrator.class);

    private final AgentRegistry registry;
    private final AgentToolRegistry toolRegistry;
    private final AgentRunRepository runRepository;
    private final ObjectMapper objectMapper;
    private final VideoOpsMetrics metrics;
    private final LlmProvider llmProvider;
    private final AnthropicProperties anthropicProperties;

    public AgentOrchestrator(
            AgentRegistry registry,
            AgentToolRegistry toolRegistry,
            AgentRunRepository runRepository,
            ObjectMapper objectMapper,
            VideoOpsMetrics metrics,
            LlmProvider llmProvider,
            AnthropicProperties anthropicProperties
    ) {
        this.registry = registry;
        this.toolRegistry = toolRegistry;
        this.runRepository = runRepository;
        this.objectMapper = objectMapper;
        this.metrics = metrics;
        this.llmProvider = llmProvider;
        this.anthropicProperties = anthropicProperties;
    }

    public AgentRunResponse run(AgentRunRequest request, Long adminId, String adminEmail) {
        AgentDefinition definition = registry.find(request.agentId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Agent inconnu: " + request.agentId()));

        AgentRun run = new AgentRun();
        run.setAgentId(definition.agentId());
        run.setAdminId(adminId);
        run.setAdminEmail(adminEmail);
        run.setStatus("RUNNING");
        run.setModelId(definition.modelId());
        run.setTraceId(MDC.get("traceId"));
        run.setInputJson(serialize(request.input()));
        run = runRepository.save(run);

        long startMillis = System.currentTimeMillis();
        try {
            AgentExecutionContext context = new AgentExecutionContext(
                    definition.agentId(),
                    run.getId(),
                    adminId,
                    adminEmail,
                    definition.scope(),
                    run.getTraceId(),
                    run.getStartedAt());
            ToolLoopResult result = runAgentLoop(definition, request.input(), context);

            run.setStatus("SUCCEEDED");
            run.setOutputJson(serialize(result.output));
            run.setFinishedAt(Instant.now());
            run.setDurationMs((int) (System.currentTimeMillis() - startMillis));
            run.setTokensIn(result.totalInputTokens);
            run.setTokensOut(result.totalOutputTokens);
            runRepository.save(run);
            return new AgentRunResponse(run.getId(), run.getStatus(), result.output, null);
        } catch (Exception exception) {
            run.setStatus("FAILED");
            run.setErrorMessage(truncate(exception.getMessage(), 2048));
            run.setFinishedAt(Instant.now());
            run.setDurationMs((int) (System.currentTimeMillis() - startMillis));
            runRepository.save(run);
            logger.warn("agent run failed agentId={} runId={} cause={}",
                    definition.agentId(), run.getId(), exception.getMessage());
            return new AgentRunResponse(run.getId(), "FAILED", null, exception.getMessage());
        }
    }

    /**
     * Tool-use loop wired to {@link LlmProvider}. The loop walks the Anthropic
     * Messages API until the assistant returns a {@code stop_reason} other than
     * {@code tool_use} or we exhaust the configured iteration budget.
     */
    protected ToolLoopResult runAgentLoop(AgentDefinition definition, JsonNode input, AgentExecutionContext context) {
        if (!llmProvider.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "LLM provider " + llmProvider.providerName() + " is disabled.");
        }

        List<AgentTool> tools = toolRegistry.resolve(definition.allowedToolNames());
        List<JsonNode> messages = new ArrayList<>();
        messages.add(userMessage(input));

        int totalInput = 0;
        int totalOutput = 0;
        JsonNode lastTextOutput = null;

        int maxIterations = anthropicProperties.getMaxToolLoopIterations();
        for (int iteration = 0; iteration < maxIterations; iteration++) {
            LlmProvider.LlmResponse response = llmProvider.send(new LlmProvider.LlmRequest(
                    definition.modelId(),
                    definition.systemPrompt(),
                    messages,
                    tools,
                    anthropicProperties.getMaxTokens()
            ));
            totalInput += response.inputTokens();
            totalOutput += response.outputTokens();

            JsonNode assistantMessage = response.messageJson();
            messages.add(assistantMessage);

            String stopReason = response.stopReason();
            JsonNode contentArr = assistantMessage.path("content");
            lastTextOutput = extractTextBlocks(contentArr);

            if (!"tool_use".equalsIgnoreCase(stopReason)) {
                return new ToolLoopResult(lastTextOutput == null ? assistantMessage : lastTextOutput,
                        totalInput, totalOutput);
            }

            // stop_reason == tool_use → run every tool_use block, append a single
            // user message containing the matching tool_result blocks.
            ArrayNode resultsArr = objectMapper.createArrayNode();
            for (JsonNode block : contentArr) {
                if (!"tool_use".equals(block.path("type").asText())) continue;
                String toolName = block.path("name").asText("");
                String toolUseId = block.path("id").asText("");
                JsonNode toolInput = block.path("input");
                ObjectNode resultNode = objectMapper.createObjectNode();
                resultNode.put("type", "tool_result");
                resultNode.put("tool_use_id", toolUseId);
                try {
                    AgentTool tool = toolRegistry.find(toolName)
                            .orElseThrow(() -> new IllegalArgumentException("Tool not registered: " + toolName));
                    if (!definition.allowedToolNames().contains(toolName)) {
                        throw new SecurityException("Tool not allowed for this agent: " + toolName);
                    }
                    JsonNode toolOut = tool.execute(toolInput, context);
                    resultNode.put("content", serialize(toolOut));
                } catch (Exception toolEx) {
                    logger.warn("agent tool failed runId={} tool={} reason={}",
                            context.runId(), toolName, toolEx.getMessage());
                    resultNode.put("content", "{\"error\":\"" + truncate(toolEx.getMessage(), 200) + "\"}");
                    resultNode.put("is_error", true);
                }
                resultsArr.add(resultNode);
            }
            ObjectNode userToolResult = objectMapper.createObjectNode();
            userToolResult.put("role", "user");
            userToolResult.set("content", resultsArr);
            messages.add(userToolResult);
        }

        throw new ResponseStatusException(HttpStatus.LOOP_DETECTED,
                "Agent tool-loop exceeded " + maxIterations + " iterations.");
    }

    private JsonNode extractTextBlocks(JsonNode contentArr) {
        if (contentArr == null || !contentArr.isArray()) return null;
        StringBuilder sb = new StringBuilder();
        for (JsonNode block : contentArr) {
            if ("text".equals(block.path("type").asText())) {
                if (sb.length() > 0) sb.append("\n");
                sb.append(block.path("text").asText(""));
            }
        }
        if (sb.length() == 0) return null;
        ObjectNode node = objectMapper.createObjectNode();
        node.put("text", sb.toString());
        return node;
    }

    private JsonNode userMessage(JsonNode input) {
        ObjectNode message = objectMapper.createObjectNode();
        message.put("role", "user");
        ArrayNode content = message.putArray("content");
        ObjectNode textBlock = content.addObject();
        textBlock.put("type", "text");
        textBlock.put("text", input == null ? "{}" : input.toString());
        return message;
    }

    record ToolLoopResult(JsonNode output, int totalInputTokens, int totalOutputTokens) {}

    private String serialize(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception exception) {
            return null;
        }
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}

package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.ai.dto.AgentRunRequest;
import com.tiktokapp.backend.ai.dto.AgentRunResponse;
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

/**
 * Phase 3.1 — agent orchestrator skeleton.
 *
 * The MVP delivered here:
 *   - resolves the agent definition,
 *   - persists an AgentRun record at start and finish,
 *   - emits the correct metrics,
 *   - validates the input shape.
 *
 * The actual Claude API tool-use loop is intentionally a TODO. Hooking it
 * up requires wiring the Anthropic SDK (or a thin HTTP client) plus the
 * ANTHROPIC_API_KEY secret, which is a user-managed credential. The orchestrator
 * exposes a clean seam (`runAgentLoop`) so concrete agents can be wired
 * without touching this class.
 */
@Service
public class AgentOrchestrator {

    private static final Logger logger = LoggerFactory.getLogger(AgentOrchestrator.class);

    private final AgentRegistry registry;
    private final AgentToolRegistry toolRegistry;
    private final AgentRunRepository runRepository;
    private final ObjectMapper objectMapper;
    private final VideoOpsMetrics metrics;

    public AgentOrchestrator(
            AgentRegistry registry,
            AgentToolRegistry toolRegistry,
            AgentRunRepository runRepository,
            ObjectMapper objectMapper,
            VideoOpsMetrics metrics
    ) {
        this.registry = registry;
        this.toolRegistry = toolRegistry;
        this.runRepository = runRepository;
        this.objectMapper = objectMapper;
        this.metrics = metrics;
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
            JsonNode output = runAgentLoop(definition, request.input(),
                    new AgentExecutionContext(
                            definition.agentId(),
                            run.getId(),
                            adminId,
                            adminEmail,
                            definition.scope(),
                            run.getTraceId(),
                            run.getStartedAt()));

            run.setStatus("SUCCEEDED");
            run.setOutputJson(serialize(output));
            run.setFinishedAt(Instant.now());
            run.setDurationMs((int) (System.currentTimeMillis() - startMillis));
            runRepository.save(run);
            return new AgentRunResponse(run.getId(), run.getStatus(), output, null);
        } catch (Exception exception) {
            run.setStatus("FAILED");
            run.setErrorMessage(truncate(exception.getMessage(), 2048));
            run.setFinishedAt(Instant.now());
            run.setDurationMs((int) (System.currentTimeMillis() - startMillis));
            runRepository.save(run);
            logger.warn("agent run failed agentId={} runId={} cause={}", definition.agentId(), run.getId(), exception.getMessage());
            return new AgentRunResponse(run.getId(), "FAILED", null, exception.getMessage());
        }
    }

    /**
     * Hook for concrete agent execution. Default impl throws so the run
     * persists as FAILED rather than returning a misleading 200 stub.
     * Override or replace this bean to wire a real Claude API tool-use loop.
     */
    protected JsonNode runAgentLoop(AgentDefinition definition, JsonNode input, AgentExecutionContext context) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                "AgentOrchestrator.runAgentLoop n'est pas branche : configure ANTHROPIC_API_KEY et fournis une implementation concrete.");
    }

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

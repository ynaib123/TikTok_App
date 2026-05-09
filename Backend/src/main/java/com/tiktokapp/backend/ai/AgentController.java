package com.tiktokapp.backend.ai;

import com.tiktokapp.backend.ai.dto.AgentRunRequest;
import com.tiktokapp.backend.ai.dto.AgentRunResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Collection;

@RestController
@RequestMapping("/api/ai/agents")
public class AgentController {

    private final AgentRegistry registry;
    private final AgentOrchestrator orchestrator;
    private final AgentRunBroadcaster broadcaster;
    private final boolean agentsEnabled;

    public AgentController(
            AgentRegistry registry,
            AgentOrchestrator orchestrator,
            AgentRunBroadcaster broadcaster,
            @Value("${app.ai.agents.enabled:false}") boolean agentsEnabled
    ) {
        this.registry = registry;
        this.orchestrator = orchestrator;
        this.broadcaster = broadcaster;
        this.agentsEnabled = agentsEnabled;
    }

    @GetMapping
    public ResponseEntity<Collection<AgentDefinition>> listAgents() {
        return ResponseEntity.ok(registry.all());
    }

    @PostMapping("/{agentId}/run")
    public ResponseEntity<AgentRunResponse> run(
            @PathVariable String agentId,
            @Valid @RequestBody AgentRunRequest request,
            Authentication authentication
    ) {
        if (!agentsEnabled) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                    "Agents IA non actives : definir app.ai.agents.enabled=true et configurer ANTHROPIC_API_KEY.");
        }
        AgentRunRequest resolved = request.agentId() == null
                ? new AgentRunRequest(agentId, request.input())
                : request;
        return ResponseEntity.ok(orchestrator.run(
                resolved,
                null,
                authentication == null ? null : authentication.getName()
        ));
    }

    /**
     * Server-Sent Events stream of agent run lifecycle events. Powers the AI
     * Agents 3D supervision page (particle flux + Matrix terminal). Events :
     * {@code agent_run_started} / {@code agent_tool_call} / {@code agent_run_finished}.
     */
    @GetMapping(value = "/stream", produces = "text/event-stream")
    public SseEmitter stream() {
        return broadcaster.subscribe();
    }
}

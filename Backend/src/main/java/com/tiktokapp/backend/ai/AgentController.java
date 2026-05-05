package com.tiktokapp.backend.ai;

import com.tiktokapp.backend.ai.dto.AgentRunRequest;
import com.tiktokapp.backend.ai.dto.AgentRunResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;

@RestController
@RequestMapping("/api/ai/agents")
public class AgentController {

    private final AgentRegistry registry;
    private final AgentOrchestrator orchestrator;

    public AgentController(AgentRegistry registry, AgentOrchestrator orchestrator) {
        this.registry = registry;
        this.orchestrator = orchestrator;
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
        // honour both path and body — body wins if mismatched
        AgentRunRequest resolved = request.agentId() == null
                ? new AgentRunRequest(agentId, request.input())
                : request;
        return ResponseEntity.ok(orchestrator.run(
                resolved,
                null,
                authentication == null ? null : authentication.getName()
        ));
    }
}

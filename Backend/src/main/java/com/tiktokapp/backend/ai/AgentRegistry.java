package com.tiktokapp.backend.ai;

import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 3.1 — registry of available AI agents, keyed by agentId.
 * Concrete agent beans register themselves at boot via {@link #register}.
 */
@Service
public class AgentRegistry {

    private final Map<String, AgentDefinition> definitions = new ConcurrentHashMap<>();

    public void register(AgentDefinition definition) {
        if (definition == null || definition.agentId() == null || definition.agentId().isBlank()) {
            throw new IllegalArgumentException("AgentDefinition must have a non-blank agentId");
        }
        definitions.put(definition.agentId(), definition);
    }

    public Optional<AgentDefinition> find(String agentId) {
        return Optional.ofNullable(definitions.get(agentId));
    }

    public Collection<AgentDefinition> all() {
        return definitions.values();
    }
}

package com.tiktokapp.backend.ai;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AgentToolRegistry {

    private final Map<String, AgentTool> toolsByName;

    public AgentToolRegistry(List<AgentTool> tools) {
        this.toolsByName = tools.stream()
                .collect(Collectors.toUnmodifiableMap(AgentTool::name, tool -> tool));
    }

    public Optional<AgentTool> find(String name) {
        return Optional.ofNullable(toolsByName.get(name));
    }

    public List<AgentTool> resolve(List<String> names) {
        return names.stream()
                .map(toolsByName::get)
                .filter(java.util.Objects::nonNull)
                .toList();
    }
}

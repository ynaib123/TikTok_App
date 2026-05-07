package com.tiktokapp.backend.ai.repository;

import com.tiktokapp.backend.ai.model.AgentRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRunRepository extends JpaRepository<AgentRun, Long> {

    Page<AgentRun> findByAgentIdOrderByStartedAtDesc(String agentId, Pageable pageable);
}

package com.tiktokapp.backend.ai.repository;

import com.tiktokapp.backend.ai.model.AgentConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AgentConversationRepository extends JpaRepository<AgentConversation, Long> {

    /**
     * Retourne la conversation ACTIVE pour un canal externe (chat_id Telegram,
     * session UI…). Garantie unique par l'index partiel uq_agent_conversations_active.
     */
    Optional<AgentConversation> findFirstByAgentIdAndChannelAndChannelRefAndStatus(
            String agentId, String channel, String channelRef, String status);
}

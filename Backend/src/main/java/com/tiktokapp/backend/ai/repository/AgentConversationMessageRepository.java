package com.tiktokapp.backend.ai.repository;

import com.tiktokapp.backend.ai.model.AgentConversationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AgentConversationMessageRepository extends JpaRepository<AgentConversationMessage, Long> {

    /** Renvoie l'historique complet ordonné — utilisé pour replay au prochain tour. */
    List<AgentConversationMessage> findByConversationIdOrderBySequenceAsc(Long conversationId);

    /** Sequence du dernier message — base pour incrémenter au prochain insert. NULL si vide. */
    @Query("SELECT MAX(m.sequence) FROM AgentConversationMessage m WHERE m.conversationId = :conversationId")
    Integer findMaxSequenceByConversationId(@Param("conversationId") Long conversationId);
}

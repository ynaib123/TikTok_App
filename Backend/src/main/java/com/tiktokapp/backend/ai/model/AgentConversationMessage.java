package com.tiktokapp.backend.ai.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Phase 3.2 — un message dans une conversation d'agent.
 *
 * <p>{@code contentJson} stocke les content blocks Anthropic au format wire :
 * pour un message user, c'est un array {@code [{"type":"text","text":"..."}]} ;
 * pour un message assistant qui appelle un tool, c'est
 * {@code [{"type":"text","text":"..."},{"type":"tool_use","id":"...","name":"...","input":{...}}]} ;
 * pour le tour suivant côté user (résultats des tools),
 * {@code [{"type":"tool_result","tool_use_id":"...","content":"..."}]}.
 *
 * <p>Stocker le content brut permet de reconstituer la conversation telle quelle
 * pour le prochain appel à {@code messages.create} sans transformation lossy.
 */
@Entity
@Table(name = "agent_conversation_messages")
public class AgentConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(nullable = false)
    private Integer sequence;

    @Column(nullable = false, length = 32)
    private String role;

    @Column(name = "content_json", nullable = false, columnDefinition = "TEXT")
    private String contentJson;

    @Column(name = "agent_run_id")
    private Long agentRunId;

    @Column(name = "tokens_in")
    private Integer tokensIn;

    @Column(name = "tokens_out")
    private Integer tokensOut;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }
    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContentJson() { return contentJson; }
    public void setContentJson(String contentJson) { this.contentJson = contentJson; }
    public Long getAgentRunId() { return agentRunId; }
    public void setAgentRunId(Long agentRunId) { this.agentRunId = agentRunId; }
    public Integer getTokensIn() { return tokensIn; }
    public void setTokensIn(Integer tokensIn) { this.tokensIn = tokensIn; }
    public Integer getTokensOut() { return tokensOut; }
    public void setTokensOut(Integer tokensOut) { this.tokensOut = tokensOut; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public static final String ROLE_USER = "user";
    public static final String ROLE_ASSISTANT = "assistant";
}

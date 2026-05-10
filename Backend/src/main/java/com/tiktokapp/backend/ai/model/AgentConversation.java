package com.tiktokapp.backend.ai.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Phase 3.2 — fil de discussion multi-tours d'un agent conversationnel.
 *
 * <p>Une conversation regroupe N messages (rôle user/assistant/tool_result) liés
 * par {@code conversation_id}. Le mapping {@code (channel, channel_ref)} permet
 * de retrouver la conversation ACTIVE pour un canal externe (chat_id Telegram,
 * session UI, etc.) afin de poursuivre le contexte sans repartir de zéro.
 */
@Entity
@Table(name = "agent_conversations")
public class AgentConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agent_id", nullable = false, length = 64)
    private String agentId;

    @Column(nullable = false, length = 32)
    private String channel;

    @Column(name = "channel_ref", nullable = false, length = 128)
    private String channelRef;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "admin_email", length = 320)
    private String adminEmail;

    @Column(nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt = Instant.now();

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getChannelRef() { return channelRef; }
    public void setChannelRef(String channelRef) { this.channelRef = channelRef; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }
    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_ARCHIVED = "ARCHIVED";

    public static final String CHANNEL_TELEGRAM = "TELEGRAM";
    public static final String CHANNEL_UI = "UI";
    public static final String CHANNEL_API = "API";
}

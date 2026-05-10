package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.model.AgentConversation;
import com.tiktokapp.backend.ai.model.AgentConversationMessage;
import com.tiktokapp.backend.ai.repository.AgentConversationMessageRepository;
import com.tiktokapp.backend.ai.repository.AgentConversationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Phase 3.2 — service conversationnel multi-tours.
 *
 * <p>Pour les agents qui doivent garder le contexte entre messages (Supervisor
 * Telegram, chat in-app), wrappe {@link AgentOrchestrator} avec :
 * <ol>
 *   <li>Lookup d'une conversation ACTIVE par {@code (agent_id, channel, channel_ref)}.</li>
 *   <li>Reload de l'historique depuis {@code agent_conversation_messages}.</li>
 *   <li>Append du nouveau message user.</li>
 *   <li>Appel {@link AgentOrchestrator#runConversation} avec l'historique complet.</li>
 *   <li>Persistance des nouveaux messages assistant (+ blocs tool_use/tool_result).</li>
 *   <li>Bump de {@code last_message_at} pour le tri.</li>
 * </ol>
 *
 * <p>L'extraction du texte final pour rendu (Telegram, UI) se fait via
 * {@link #extractAssistantText(JsonNode)} : on ne renvoie que les blocs {@code text}
 * — les tool calls sont du contexte interne, pas de la réponse utilisateur.
 */
@Service
public class ConversationalAgentService {

    private static final Logger logger = LoggerFactory.getLogger(ConversationalAgentService.class);

    private final AgentRegistry registry;
    private final AgentOrchestrator orchestrator;
    private final AgentConversationRepository conversationRepo;
    private final AgentConversationMessageRepository messageRepo;
    private final ObjectMapper objectMapper;

    public ConversationalAgentService(
            AgentRegistry registry,
            AgentOrchestrator orchestrator,
            AgentConversationRepository conversationRepo,
            AgentConversationMessageRepository messageRepo,
            ObjectMapper objectMapper
    ) {
        this.registry = registry;
        this.orchestrator = orchestrator;
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.objectMapper = objectMapper;
    }

    /**
     * Envoie un message dans une conversation. Crée la conversation si elle
     * n'existe pas encore. Retourne le texte final de l'assistant à renvoyer
     * au canal externe (Telegram, UI).
     */
    @Transactional
    public TurnResult sendMessage(String agentId, String channel, String channelRef, String userText, Long adminId, String adminEmail) {
        AgentDefinition definition = registry.find(agentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Agent inconnu: " + agentId));

        AgentConversation conversation = findOrCreate(agentId, channel, channelRef, adminId, adminEmail);

        // 1. Reload historique brut, on déserialise chaque content_json en JsonNode
        //    (déjà au format wire Anthropic — pas de transformation nécessaire).
        List<AgentConversationMessage> history = messageRepo.findByConversationIdOrderBySequenceAsc(conversation.getId());
        List<JsonNode> messages = new ArrayList<>(history.size() + 1);
        for (AgentConversationMessage m : history) {
            messages.add(rebuildMessage(m.getRole(), m.getContentJson()));
        }

        // 2. Append le nouveau message user (un seul block text).
        JsonNode userMessage = buildUserTextMessage(userText);
        messages.add(userMessage);

        int nextSeq = nextSequence(conversation.getId());
        AgentConversationMessage userRow = new AgentConversationMessage();
        userRow.setConversationId(conversation.getId());
        userRow.setSequence(nextSeq);
        userRow.setRole(AgentConversationMessage.ROLE_USER);
        userRow.setContentJson(serialize(userMessage.path("content")));
        messageRepo.save(userRow);

        // 3. Appel orchestrator avec l'historique complet.
        AgentExecutionContext context = new AgentExecutionContext(
                definition.agentId(), null, adminId, adminEmail,
                definition.scope(), null, Instant.now());
        AgentOrchestrator.ConversationLoopResult result = orchestrator.runConversation(definition, messages, context);

        // 4. Persiste tous les nouveaux messages assistant + tool_result post user.
        //    On itère en partant de l'index APRÈS le user qu'on vient d'ajouter.
        int seq = nextSeq + 1;
        for (int i = history.size() + 1; i < result.messages().size(); i++) {
            JsonNode m = result.messages().get(i);
            AgentConversationMessage row = new AgentConversationMessage();
            row.setConversationId(conversation.getId());
            row.setSequence(seq++);
            row.setRole(m.path("role").asText("assistant"));
            row.setContentJson(serialize(m.path("content")));
            // Les tokens du run global sont attribués au dernier message assistant
            // pour rester compréhensible dans les requêtes d'audit.
            if (i == result.messages().size() - 1) {
                row.setTokensIn(result.totalInputTokens());
                row.setTokensOut(result.totalOutputTokens());
            }
            messageRepo.save(row);
        }

        conversation.setLastMessageAt(Instant.now());
        conversationRepo.save(conversation);

        String assistantText = extractAssistantText(result.output());
        return new TurnResult(conversation.getId(), assistantText, result.totalInputTokens(), result.totalOutputTokens());
    }

    /** Archive la conversation active — utilisé par /reset depuis Telegram ou l'UI. */
    @Transactional
    public Optional<Long> resetConversation(String agentId, String channel, String channelRef) {
        return conversationRepo.findFirstByAgentIdAndChannelAndChannelRefAndStatus(
                agentId, channel, channelRef, AgentConversation.STATUS_ACTIVE)
                .map(c -> {
                    c.setStatus(AgentConversation.STATUS_ARCHIVED);
                    c.setArchivedAt(Instant.now());
                    conversationRepo.save(c);
                    logger.info("agent_conversation archived id={} agent={} channel={} ref={}",
                            c.getId(), agentId, channel, channelRef);
                    return c.getId();
                });
    }

    private AgentConversation findOrCreate(String agentId, String channel, String channelRef, Long adminId, String adminEmail) {
        return conversationRepo.findFirstByAgentIdAndChannelAndChannelRefAndStatus(
                agentId, channel, channelRef, AgentConversation.STATUS_ACTIVE)
                .orElseGet(() -> {
                    AgentConversation fresh = new AgentConversation();
                    fresh.setAgentId(agentId);
                    fresh.setChannel(channel);
                    fresh.setChannelRef(channelRef);
                    fresh.setAdminId(adminId);
                    fresh.setAdminEmail(adminEmail);
                    fresh.setStatus(AgentConversation.STATUS_ACTIVE);
                    return conversationRepo.save(fresh);
                });
    }

    private int nextSequence(Long conversationId) {
        Integer max = messageRepo.findMaxSequenceByConversationId(conversationId);
        return max == null ? 1 : max + 1;
    }

    private JsonNode buildUserTextMessage(String text) {
        ObjectNode msg = objectMapper.createObjectNode();
        msg.put("role", AgentConversationMessage.ROLE_USER);
        ArrayNode content = msg.putArray("content");
        ObjectNode textBlock = content.addObject();
        textBlock.put("type", "text");
        textBlock.put("text", text == null ? "" : text);
        return msg;
    }

    private JsonNode rebuildMessage(String role, String contentJson) {
        ObjectNode msg = objectMapper.createObjectNode();
        msg.put("role", role);
        try {
            msg.set("content", objectMapper.readTree(contentJson));
        } catch (Exception parseException) {
            // Historique corrompu : on le saute plutôt que de planter le tour.
            logger.warn("agent conversation message content unparseable, replacing with empty content");
            msg.putArray("content");
        }
        return msg;
    }

    /** Extrait le texte concaténé des blocs {@code text} d'une réponse assistant. */
    public String extractAssistantText(JsonNode output) {
        if (output == null) return "";
        if (output.isObject() && output.has("text")) return output.path("text").asText("");
        if (output.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode block : output) {
                if ("text".equals(block.path("type").asText())) {
                    if (sb.length() > 0) sb.append("\n");
                    sb.append(block.path("text").asText(""));
                }
            }
            return sb.toString();
        }
        return output.toString();
    }

    private String serialize(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception serializationException) {
            return "[]";
        }
    }

    public record TurnResult(Long conversationId, String assistantText, int tokensIn, int tokensOut) {}
}

package com.tiktokapp.backend.ai;

import com.tiktokapp.backend.ai.model.AgentConversation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Bridge HTTP appelé par le workflow n8n Telegram. Reçoit un message texte
 * d'un chat Telegram autorisé, le passe au Supervisor, retourne la réponse à
 * envoyer côté Telegram.
 *
 * <p>Sécurité (deux couches) :
 * <ol>
 *   <li><b>InternalSecretFilter</b> applique sur /api/video-ops/internal/** :
 *       header {@code X-Video-Ops-Internal-Secret} requis. n8n l'envoie déjà
 *       pour les autres endpoints internes — pas de double secret à gérer.</li>
 *   <li><b>Whitelist chat_id</b> {@code app.ai.telegram.allowed-chat-ids} :
 *       refuse toute conversation depuis un chat inconnu (un attaquant qui
 *       devine le secret interne ne peut quand même pas piloter l'agent
 *       depuis un compte Telegram aléatoire).</li>
 * </ol>
 */
@RestController
@RequestMapping("/api/video-ops/internal/agents/telegram")
public class TelegramAgentController {

    private static final Logger logger = LoggerFactory.getLogger(TelegramAgentController.class);
    private static final String AGENT_ID = "supervisor";

    private final ConversationalAgentService conversationalService;
    private final boolean enabled;
    private final boolean agentsEnabled;
    private final Set<String> allowedChatIds;

    public TelegramAgentController(
            ConversationalAgentService conversationalService,
            @Value("${app.ai.telegram.enabled:false}") boolean enabled,
            @Value("${app.ai.agents.enabled:false}") boolean agentsEnabled,
            @Value("${app.ai.telegram.allowed-chat-ids:}") String allowedChatIdsCsv
    ) {
        this.conversationalService = conversationalService;
        this.enabled = enabled;
        this.agentsEnabled = agentsEnabled;
        this.allowedChatIds = parseChatIds(allowedChatIdsCsv);
    }

    @PostMapping("/message")
    public ResponseEntity<TelegramReplyResponse> handleMessage(@Valid @RequestBody TelegramMessageRequest request) {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                    "Telegram bridge desactive : APP_AI_TELEGRAM_ENABLED=true requis.");
        }
        if (!agentsEnabled) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                    "Agents IA non actives : APP_AI_AGENTS_ENABLED=true + ANTHROPIC_API_KEY requis.");
        }

        String chatIdStr = String.valueOf(request.chatId());
        if (!allowedChatIds.isEmpty() && !allowedChatIds.contains(chatIdStr)) {
            logger.warn("telegram_bridge forbidden chatId={} reason=chat_not_whitelisted", chatIdStr);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chat non autorise. Ajouter " + chatIdStr + " a APP_AI_TELEGRAM_ALLOWED_CHAT_IDS.");
        }

        // /reset → archive la conversation active et confirme.
        String text = request.text() == null ? "" : request.text().trim();
        if ("/reset".equalsIgnoreCase(text) || "/start".equalsIgnoreCase(text)) {
            conversationalService.resetConversation(AGENT_ID, AgentConversation.CHANNEL_TELEGRAM, chatIdStr);
            return ResponseEntity.ok(new TelegramReplyResponse(
                    "Conversation reinitialisee. Dis-moi ce que tu veux faire (ex: 'cree une video food et publie-la' ou 'liste mes idees').",
                    null
            ));
        }
        if (text.isEmpty()) {
            return ResponseEntity.ok(new TelegramReplyResponse(
                    "Message vide ignore. Envoie du texte ou /reset.",
                    null
            ));
        }

        try {
            ConversationalAgentService.TurnResult result = conversationalService.sendMessage(
                    AGENT_ID,
                    AgentConversation.CHANNEL_TELEGRAM,
                    chatIdStr,
                    text,
                    null,
                    request.userHandle() == null ? null : "telegram:" + request.userHandle()
            );
            String reply = result.assistantText();
            if (reply == null || reply.isBlank()) {
                reply = "(reponse vide — l'agent n'a pas produit de texte. Reformule peut-etre ?)";
            }
            return ResponseEntity.ok(new TelegramReplyResponse(reply, result.conversationId()));
        } catch (ResponseStatusException known) {
            throw known;
        } catch (Exception unexpected) {
            logger.error("telegram_bridge agent_error chatId={} cause={}", chatIdStr, unexpected.getMessage(), unexpected);
            return ResponseEntity.ok(new TelegramReplyResponse(
                    "Erreur interne pendant le traitement de ta demande. Reessaie ou /reset.",
                    null
            ));
        }
    }

    private static Set<String> parseChatIds(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        return Stream.of(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public record TelegramMessageRequest(
            @NotNull Long chatId,
            @NotBlank String text,
            String userHandle
    ) {}

    public record TelegramReplyResponse(String text, Long conversationId) {}
}

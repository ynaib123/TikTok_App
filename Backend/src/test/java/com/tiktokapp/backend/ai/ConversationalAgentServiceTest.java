package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.model.AgentConversation;
import com.tiktokapp.backend.ai.model.AgentConversationMessage;
import com.tiktokapp.backend.ai.repository.AgentConversationMessageRepository;
import com.tiktokapp.backend.ai.repository.AgentConversationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConversationalAgentServiceTest {

    @Mock private AgentRegistry registry;
    @Mock private AgentOrchestrator orchestrator;
    @Mock private AgentConversationRepository conversationRepo;
    @Mock private AgentConversationMessageRepository messageRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private ConversationalAgentService service;

    private AgentDefinition supervisorDef;

    @BeforeEach
    void setUp() {
        supervisorDef = new AgentDefinition(
                "supervisor", "Supervisor", "Test", AgentDefinition.AgentScope.READ_WRITE_LIMITED,
                "claude-opus-4-7", "system", List.of()
        );
        service = new ConversationalAgentService(registry, orchestrator, conversationRepo, messageRepo, objectMapper);
    }

    @Test
    void firstMessageCreatesConversationAndPersistsBothTurns() {
        when(registry.find("supervisor")).thenReturn(Optional.of(supervisorDef));
        when(conversationRepo.findFirstByAgentIdAndChannelAndChannelRefAndStatus(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        AgentConversation persisted = new AgentConversation();
        persisted.setId(1L);
        persisted.setAgentId("supervisor");
        persisted.setChannel("TELEGRAM");
        persisted.setChannelRef("99");
        when(conversationRepo.save(any(AgentConversation.class))).thenReturn(persisted);
        when(messageRepo.findByConversationIdOrderBySequenceAsc(1L)).thenReturn(List.of());
        when(messageRepo.findMaxSequenceByConversationId(1L)).thenReturn(null);
        when(orchestrator.runConversation(eq(supervisorDef), any(), any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<JsonNode> messages = invocation.getArgument(1);
            // L'orchestrator simulé ajoute un message assistant à la liste passée.
            ObjectNode assistant = objectMapper.createObjectNode();
            assistant.put("role", "assistant");
            ArrayNode content = assistant.putArray("content");
            ObjectNode textBlock = content.addObject();
            textBlock.put("type", "text");
            textBlock.put("text", "Bonjour !");
            messages.add(assistant);
            ObjectNode output = objectMapper.createObjectNode();
            output.put("text", "Bonjour !");
            return new AgentOrchestrator.ConversationLoopResult(output, 100, 50, messages);
        });

        ConversationalAgentService.TurnResult result = service.sendMessage(
                "supervisor", "TELEGRAM", "99", "salut", null, null);

        assertThat(result.assistantText()).isEqualTo("Bonjour !");
        assertThat(result.tokensIn()).isEqualTo(100);
        assertThat(result.tokensOut()).isEqualTo(50);

        // 1 conversation créée + persistance pour bump last_message_at = 2 saves.
        verify(conversationRepo, atLeast(2)).save(any(AgentConversation.class));
        // 1 message user + 1 message assistant = 2 messages persistés.
        ArgumentCaptor<AgentConversationMessage> messageCaptor = ArgumentCaptor.forClass(AgentConversationMessage.class);
        verify(messageRepo, times(2)).save(messageCaptor.capture());
        List<AgentConversationMessage> persistedMessages = messageCaptor.getAllValues();
        assertThat(persistedMessages.get(0).getRole()).isEqualTo("user");
        assertThat(persistedMessages.get(0).getSequence()).isEqualTo(1);
        assertThat(persistedMessages.get(1).getRole()).isEqualTo("assistant");
        assertThat(persistedMessages.get(1).getSequence()).isEqualTo(2);
        // Tokens attribués au dernier message assistant.
        assertThat(persistedMessages.get(1).getTokensIn()).isEqualTo(100);
        assertThat(persistedMessages.get(1).getTokensOut()).isEqualTo(50);
    }

    @Test
    void resumesExistingConversationWithFullHistory() {
        when(registry.find("supervisor")).thenReturn(Optional.of(supervisorDef));
        AgentConversation existing = new AgentConversation();
        existing.setId(7L);
        existing.setAgentId("supervisor");
        when(conversationRepo.findFirstByAgentIdAndChannelAndChannelRefAndStatus(any(), any(), any(), any()))
                .thenReturn(Optional.of(existing));

        AgentConversationMessage prevUser = new AgentConversationMessage();
        prevUser.setSequence(1);
        prevUser.setRole("user");
        prevUser.setContentJson("[{\"type\":\"text\",\"text\":\"liste mes idees\"}]");
        AgentConversationMessage prevAssistant = new AgentConversationMessage();
        prevAssistant.setSequence(2);
        prevAssistant.setRole("assistant");
        prevAssistant.setContentJson("[{\"type\":\"text\",\"text\":\"3 idees en cours.\"}]");
        when(messageRepo.findByConversationIdOrderBySequenceAsc(7L)).thenReturn(List.of(prevUser, prevAssistant));
        when(messageRepo.findMaxSequenceByConversationId(7L)).thenReturn(2);

        when(orchestrator.runConversation(eq(supervisorDef), any(), any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<JsonNode> messages = invocation.getArgument(1);
            // L'historique reçu doit déjà contenir les 2 messages précédents + le nouveau user.
            assertThat(messages).hasSize(3);
            assertThat(messages.get(0).path("role").asText()).isEqualTo("user");
            assertThat(messages.get(1).path("role").asText()).isEqualTo("assistant");
            assertThat(messages.get(2).path("role").asText()).isEqualTo("user");
            assertThat(messages.get(2).path("content").get(0).path("text").asText()).isEqualTo("publie la 1");

            ObjectNode reply = objectMapper.createObjectNode();
            reply.put("role", "assistant");
            ArrayNode c = reply.putArray("content");
            ObjectNode tb = c.addObject();
            tb.put("type", "text");
            tb.put("text", "Confirme la publication ?");
            messages.add(reply);

            ObjectNode out = objectMapper.createObjectNode();
            out.put("text", "Confirme la publication ?");
            return new AgentOrchestrator.ConversationLoopResult(out, 50, 25, new ArrayList<>(messages));
        });

        ConversationalAgentService.TurnResult result = service.sendMessage(
                "supervisor", "TELEGRAM", "99", "publie la 1", null, null);

        assertThat(result.assistantText()).isEqualTo("Confirme la publication ?");
        assertThat(result.conversationId()).isEqualTo(7L);

        // Sequences : user=3, assistant=4.
        ArgumentCaptor<AgentConversationMessage> messageCaptor = ArgumentCaptor.forClass(AgentConversationMessage.class);
        verify(messageRepo, times(2)).save(messageCaptor.capture());
        assertThat(messageCaptor.getAllValues().get(0).getSequence()).isEqualTo(3);
        assertThat(messageCaptor.getAllValues().get(1).getSequence()).isEqualTo(4);
    }

    @Test
    void rejectsUnknownAgent() {
        when(registry.find("ghost")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.sendMessage("ghost", "TELEGRAM", "99", "hi", null, null))
                .hasMessageContaining("Agent inconnu");
    }

    @Test
    void resetArchivesActiveConversation() {
        AgentConversation active = new AgentConversation();
        active.setId(11L);
        active.setStatus("ACTIVE");
        when(conversationRepo.findFirstByAgentIdAndChannelAndChannelRefAndStatus("supervisor", "TELEGRAM", "99", "ACTIVE"))
                .thenReturn(Optional.of(active));

        Optional<Long> archived = service.resetConversation("supervisor", "TELEGRAM", "99");

        assertThat(archived).contains(11L);
        assertThat(active.getStatus()).isEqualTo("ARCHIVED");
        assertThat(active.getArchivedAt()).isNotNull();
        verify(conversationRepo).save(active);
    }

    @Test
    void extractAssistantTextHandlesObjectAndArrayShapes() {
        ObjectNode shaped = objectMapper.createObjectNode();
        shaped.put("text", "hello");
        assertThat(service.extractAssistantText(shaped)).isEqualTo("hello");

        ArrayNode arr = objectMapper.createArrayNode();
        ObjectNode block = arr.addObject();
        block.put("type", "text");
        block.put("text", "first");
        ObjectNode block2 = arr.addObject();
        block2.put("type", "text");
        block2.put("text", "second");
        assertThat(service.extractAssistantText(arr)).isEqualTo("first\nsecond");

        assertThat(service.extractAssistantText(null)).isEmpty();
    }
}

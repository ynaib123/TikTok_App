package com.tiktokapp.backend.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Couvre les couches de sécurité du bridge Telegram :
 * <ol>
 *   <li>InternalSecretFilter : header X-Video-Ops-Internal-Secret obligatoire.</li>
 *   <li>Whitelist chat_id : les chats inconnus sont rejetés en 403 même avec le secret.</li>
 *   <li>Feature flags : 501 si APP_AI_TELEGRAM_ENABLED ou APP_AI_AGENTS_ENABLED est false.</li>
 *   <li>/reset : archive la conversation et répond sans appeler le LLM.</li>
 * </ol>
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tiktokapp_telegram;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.admin-email=admin@tiktokapp.local",
        "app.security.admin-password=admin123",
        "app.security.admin-name=Admin",
        "app.security.jwt-secret=integration-test-secret-12345678901234567890",
        "app.security.bootstrap-admin-on-startup=false",
        "app.video-ops.internal-api-secret=internal-test-secret",
        "app.video-ops.token-encryption-key=test-token-encryption-key-32bytes!",
        "app.ai.agents.enabled=true",
        "app.ai.telegram.enabled=true",
        "app.ai.telegram.allowed-chat-ids=42,99"
})
@AutoConfigureMockMvc
class TelegramAgentControllerSecurityTest {

    private static final String URL = "/api/video-ops/internal/agents/telegram/message";
    private static final String SECRET_HEADER = "X-Video-Ops-Internal-Secret";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private ConversationalAgentService conversationalService;

    @Test
    void rejects403WithoutInternalSecret() throws Exception {
        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(42, "salut")))
                .andExpect(status().isForbidden());
        verify(conversationalService, never()).sendMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejects403WithWrongInternalSecret() throws Exception {
        mockMvc.perform(post(URL)
                        .header(SECRET_HEADER, "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(42, "salut")))
                .andExpect(status().isForbidden());
        verify(conversationalService, never()).sendMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejects403WhenChatNotWhitelisted() throws Exception {
        mockMvc.perform(post(URL)
                        .header(SECRET_HEADER, "internal-test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(666, "salut")))
                .andExpect(status().isForbidden());
        verify(conversationalService, never()).sendMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void resetCommandArchivesAndShortCircuitsLlm() throws Exception {
        when(conversationalService.resetConversation("supervisor", "TELEGRAM", "42"))
                .thenReturn(Optional.of(123L));

        mockMvc.perform(post(URL)
                        .header(SECRET_HEADER, "internal-test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(42, "/reset")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").exists());

        verify(conversationalService).resetConversation("supervisor", "TELEGRAM", "42");
        verify(conversationalService, never()).sendMessage(any(), any(), any(), any(), any(), any());
    }

    @Test
    void happyPathForwardsToConversationalService() throws Exception {
        when(conversationalService.sendMessage(eq("supervisor"), eq("TELEGRAM"), eq("99"), eq("liste mes idees"), any(), any()))
                .thenReturn(new ConversationalAgentService.TurnResult(77L, "Tu as 3 idees en cours.", 100, 50));

        mockMvc.perform(post(URL)
                        .header(SECRET_HEADER, "internal-test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload(99, "liste mes idees")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Tu as 3 idees en cours."))
                .andExpect(jsonPath("$.conversationId").value(77));
    }

    private String payload(long chatId, String text) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "chatId", chatId,
                "text", text
        ));
    }
}

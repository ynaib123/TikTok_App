package com.tiktokapp.backend.ai.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LlmProviderRouterTest {

    @Mock private AnthropicProvider anthropicProvider;
    @Mock private GroqProvider groqProvider;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private LlmProviderRouter router;
    private AnthropicProperties anthropicProps;
    private GroqProperties groqProps;

    @BeforeEach
    void setUp() {
        anthropicProps = new AnthropicProperties();
        anthropicProps.setDefaultModelId("claude-sonnet-4-6");
        groqProps = new GroqProperties();
        groqProps.setDefaultModelId("llama-3.3-70b-versatile");
        router = new LlmProviderRouter(anthropicProvider, groqProvider, anthropicProps, groqProps);
    }

    @Test
    void claudePrefixRoutesToAnthropic() {
        assertThat(router.pickProvider("claude-opus-4-7")).isSameAs(anthropicProvider);
        assertThat(router.pickProvider("claude-haiku-4-5")).isSameAs(anthropicProvider);
        assertThat(router.pickProvider("CLAUDE-OPUS-4-7")).isSameAs(anthropicProvider);
    }

    @Test
    void groqPrefixesRouteToGroq() {
        assertThat(router.pickProvider("llama-3.3-70b-versatile")).isSameAs(groqProvider);
        assertThat(router.pickProvider("mixtral-8x7b-32768")).isSameAs(groqProvider);
        assertThat(router.pickProvider("gemma-7b-it")).isSameAs(groqProvider);
        assertThat(router.pickProvider("groq/llama-3.1")).isSameAs(groqProvider);
    }

    @Test
    void unknownPrefixFallsBackToFirstEnabled() {
        when(anthropicProvider.isEnabled()).thenReturn(false);
        when(groqProvider.isEnabled()).thenReturn(true);
        assertThat(router.pickProvider("gpt-4")).isSameAs(groqProvider);
    }

    @Test
    void sendFallsBackWhenAnthropicDisabledAndSubstitutesModelId() {
        when(anthropicProvider.isEnabled()).thenReturn(false);
        when(groqProvider.isEnabled()).thenReturn(true);
        ObjectNode dummyMessage = objectMapper.createObjectNode();
        when(groqProvider.send(org.mockito.ArgumentMatchers.any())).thenReturn(
                new LlmProvider.LlmResponse("end_turn", dummyMessage, 10, 5, "llama-3.3-70b-versatile"));

        LlmProvider.LlmResponse response = router.send(new LlmProvider.LlmRequest(
                "claude-opus-4-7", "system", List.of(), List.of(), 1024));

        ArgumentCaptor<LlmProvider.LlmRequest> captor = ArgumentCaptor.forClass(LlmProvider.LlmRequest.class);
        verify(groqProvider).send(captor.capture());
        verify(anthropicProvider, never()).send(org.mockito.ArgumentMatchers.any());
        // Le modelId a été substitué pour respecter le format Groq.
        assertThat(captor.getValue().modelId()).isEqualTo("llama-3.3-70b-versatile");
        assertThat(captor.getValue().systemPrompt()).isEqualTo("system");
        assertThat(captor.getValue().maxTokens()).isEqualTo(1024);
        assertThat(response.modelId()).isEqualTo("llama-3.3-70b-versatile");
    }

    @Test
    void sendThrowsWhenNoProviderEnabled() {
        when(anthropicProvider.isEnabled()).thenReturn(false);
        when(groqProvider.isEnabled()).thenReturn(false);

        assertThatThrownBy(() -> router.send(new LlmProvider.LlmRequest(
                "claude-opus-4-7", null, List.of(), List.of(), 1024)))
                .hasMessageContaining("désactivé et aucun fallback disponible");
    }

    @Test
    void canRouteReflectsTargetProviderState() {
        when(anthropicProvider.isEnabled()).thenReturn(true);
        when(groqProvider.isEnabled()).thenReturn(false);

        assertThat(router.canRoute("claude-opus-4-7")).isTrue();
        assertThat(router.canRoute("llama-3.3-70b-versatile")).isFalse();
    }

    @Test
    void isEnabledIsTrueIfAnyProviderEnabled() {
        when(anthropicProvider.isEnabled()).thenReturn(false);
        when(groqProvider.isEnabled()).thenReturn(true);
        assertThat(router.isEnabled()).isTrue();

        when(groqProvider.isEnabled()).thenReturn(false);
        assertThat(router.isEnabled()).isFalse();
    }
}

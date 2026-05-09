package com.tiktokapp.backend.ai.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.ai.AgentTool;

import java.util.List;

/**
 * Provider-agnostic LLM interface for the agent tool-use loop. Today
 * implemented by {@link AnthropicProvider}; a Groq impl can ship later
 * without touching the orchestrator.
 *
 * <p>The {@link #send} call is one round of the loop : the caller passes
 * the full conversation so far, the provider returns the next assistant
 * turn (which may include {@code tool_use} blocks). The orchestrator runs
 * the tool calls, appends {@code tool_result} blocks to the messages and
 * calls {@link #send} again until the assistant returns a {@code stop_reason}
 * other than {@code tool_use}.
 */
public interface LlmProvider {

    String providerName();

    boolean isEnabled();

    LlmResponse send(LlmRequest request);

    record LlmRequest(
            String modelId,
            String systemPrompt,
            List<JsonNode> messages,
            List<AgentTool> tools,
            int maxTokens
    ) {}

    /**
     * Provider-agnostic response. {@code stopReason} is one of
     * {@code "end_turn"} / {@code "tool_use"} / {@code "max_tokens"} /
     * {@code "stop_sequence"}. {@code messageJson} is the full message object
     * the orchestrator must append to the conversation.
     */
    record LlmResponse(
            String stopReason,
            JsonNode messageJson,
            int inputTokens,
            int outputTokens,
            String modelId
    ) {}
}

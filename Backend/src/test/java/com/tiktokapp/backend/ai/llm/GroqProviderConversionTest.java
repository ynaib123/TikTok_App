package com.tiktokapp.backend.ai.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.AgentTool;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vérifie la conversion bidirectionnelle entre le format Anthropic
 * (content blocks) et le format OpenAI (tool_calls/role=tool) — c'est
 * la zone la plus risquée du GroqProvider, donc 100% testée.
 *
 * <p>On utilise reflection pour atteindre les méthodes privées plutôt
 * que de lancer un vrai HTTP — le but est de valider la logique de
 * conversion, pas l'I/O.
 */
class GroqProviderConversionTest {

    private GroqProvider provider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        GroqProperties props = new GroqProperties();
        props.setDefaultModelId("llama-3.3-70b-versatile");
        provider = new GroqProvider(props, objectMapper);
    }

    @Test
    void buildsOpenAiRequestWithSystemFirstAndConvertsTextMessage() throws Exception {
        ArrayNode messages = objectMapper.createArrayNode();
        ObjectNode userMsg = messages.addObject();
        userMsg.put("role", "user");
        ArrayNode userContent = userMsg.putArray("content");
        userContent.addObject().put("type", "text").put("text", "Bonjour");

        ObjectNode body = invokeBuildRequest(new LlmProvider.LlmRequest(
                "llama-3.3-70b-versatile",
                "Tu es un agent",
                List.of(messages.get(0)),
                List.of(),
                1024
        ));

        JsonNode oaMessages = body.path("messages");
        assertThat(oaMessages.size()).isEqualTo(2);
        assertThat(oaMessages.get(0).path("role").asText()).isEqualTo("system");
        assertThat(oaMessages.get(0).path("content").asText()).isEqualTo("Tu es un agent");
        assertThat(oaMessages.get(1).path("role").asText()).isEqualTo("user");
        assertThat(oaMessages.get(1).path("content").asText()).isEqualTo("Bonjour");
    }

    @Test
    void convertsAssistantToolUseToOpenAiToolCalls() throws Exception {
        ObjectNode anthropicAssistant = objectMapper.createObjectNode();
        anthropicAssistant.put("role", "assistant");
        ArrayNode content = anthropicAssistant.putArray("content");
        content.addObject().put("type", "text").put("text", "Je vais lister.");
        ObjectNode toolUse = content.addObject();
        toolUse.put("type", "tool_use");
        toolUse.put("id", "toolu_abc");
        toolUse.put("name", "list_recent_ideas");
        toolUse.putObject("input").put("limit", 5);

        ObjectNode body = invokeBuildRequest(new LlmProvider.LlmRequest(
                "llama-3.3-70b-versatile", null,
                List.of(anthropicAssistant), List.of(), 1024
        ));

        JsonNode assistant = body.path("messages").get(0); // pas de system, donc index 0
        assertThat(assistant.path("role").asText()).isEqualTo("assistant");
        assertThat(assistant.path("content").asText()).isEqualTo("Je vais lister.");
        JsonNode toolCalls = assistant.path("tool_calls");
        assertThat(toolCalls.isArray()).isTrue();
        assertThat(toolCalls.size()).isEqualTo(1);
        assertThat(toolCalls.get(0).path("id").asText()).isEqualTo("toolu_abc");
        assertThat(toolCalls.get(0).path("type").asText()).isEqualTo("function");
        assertThat(toolCalls.get(0).path("function").path("name").asText()).isEqualTo("list_recent_ideas");
        // Arguments sérialisés en string JSON.
        String args = toolCalls.get(0).path("function").path("arguments").asText();
        assertThat(objectMapper.readTree(args).path("limit").asInt()).isEqualTo(5);
    }

    @Test
    void convertsUserToolResultToOpenAiToolMessage() throws Exception {
        // Anthropic envoie 1 user message avec content[] de tool_result.
        ObjectNode toolResultMsg = objectMapper.createObjectNode();
        toolResultMsg.put("role", "user");
        ArrayNode content = toolResultMsg.putArray("content");
        ObjectNode result = content.addObject();
        result.put("type", "tool_result");
        result.put("tool_use_id", "toolu_abc");
        result.put("content", "{\"count\":3}");

        ObjectNode body = invokeBuildRequest(new LlmProvider.LlmRequest(
                "llama-3.3-70b-versatile", null,
                List.of(toolResultMsg), List.of(), 1024
        ));

        JsonNode msg = body.path("messages").get(0);
        assertThat(msg.path("role").asText()).isEqualTo("tool");
        assertThat(msg.path("tool_call_id").asText()).isEqualTo("toolu_abc");
        assertThat(msg.path("content").asText()).isEqualTo("{\"count\":3}");
    }

    @Test
    void convertsOpenAiResponseWithToolCallsToAnthropicShape() throws Exception {
        String openAi = """
            {
              "choices": [{
                "message": {
                  "role": "assistant",
                  "content": "Voici ce que je vais faire.",
                  "tool_calls": [{
                    "id": "call_42",
                    "type": "function",
                    "function": {
                      "name": "trigger_main_pipeline",
                      "arguments": "{\\"category\\":\\"Food\\"}"
                    }
                  }]
                },
                "finish_reason": "tool_calls"
              }],
              "usage": {"prompt_tokens": 100, "completion_tokens": 50},
              "model": "llama-3.3-70b-versatile"
            }
            """;
        JsonNode parsed = objectMapper.readTree(openAi);

        LlmProvider.LlmResponse response = invokeConvertResponse(parsed,
                new LlmProvider.LlmRequest("llama-3.3-70b-versatile", null, List.of(), List.of(), 1024));

        assertThat(response.stopReason()).isEqualTo("tool_use");
        assertThat(response.inputTokens()).isEqualTo(100);
        assertThat(response.outputTokens()).isEqualTo(50);

        JsonNode message = response.messageJson();
        assertThat(message.path("role").asText()).isEqualTo("assistant");
        JsonNode contentBlocks = message.path("content");
        assertThat(contentBlocks.size()).isEqualTo(2);
        assertThat(contentBlocks.get(0).path("type").asText()).isEqualTo("text");
        assertThat(contentBlocks.get(0).path("text").asText()).isEqualTo("Voici ce que je vais faire.");
        assertThat(contentBlocks.get(1).path("type").asText()).isEqualTo("tool_use");
        assertThat(contentBlocks.get(1).path("id").asText()).isEqualTo("call_42");
        assertThat(contentBlocks.get(1).path("name").asText()).isEqualTo("trigger_main_pipeline");
        // input doit être un objet JSON, pas une string.
        assertThat(contentBlocks.get(1).path("input").isObject()).isTrue();
        assertThat(contentBlocks.get(1).path("input").path("category").asText()).isEqualTo("Food");
    }

    @Test
    void mapsFinishReasonToAnthropicStopReason() throws Exception {
        // tool_calls -> tool_use, length -> max_tokens, stop -> end_turn.
        String[] inputs = {"tool_calls", "length", "stop", "content_filter"};
        String[] expected = {"tool_use", "max_tokens", "end_turn", "stop_sequence"};

        for (int i = 0; i < inputs.length; i++) {
            String body = String.format("""
                    {"choices":[{"message":{"role":"assistant","content":"x","tool_calls":null},
                      "finish_reason":"%s"}],"usage":{"prompt_tokens":1,"completion_tokens":1},"model":"x"}
                    """, inputs[i]);
            JsonNode parsed = objectMapper.readTree(body);
            LlmProvider.LlmResponse r = invokeConvertResponse(parsed,
                    new LlmProvider.LlmRequest("x", null, List.of(), List.of(), 1));
            assertThat(r.stopReason()).as("input=" + inputs[i]).isEqualTo(expected[i]);
        }
    }

    @Test
    void emitsToolsInOpenAiFunctionFormat() throws Exception {
        AgentTool fakeTool = new AgentTool() {
            @Override public String name() { return "list_recent_ideas"; }
            @Override public String description() { return "Liste les idees."; }
            @Override public JsonNode inputSchema() {
                ObjectNode schema = objectMapper.createObjectNode();
                schema.put("type", "object");
                return schema;
            }
            @Override public JsonNode execute(JsonNode input, com.tiktokapp.backend.ai.AgentExecutionContext ctx) { return null; }
        };

        ObjectNode body = invokeBuildRequest(new LlmProvider.LlmRequest(
                "llama-3.3-70b-versatile", null, List.of(), List.of(fakeTool), 1024));

        JsonNode tools = body.path("tools");
        assertThat(tools.size()).isEqualTo(1);
        assertThat(tools.get(0).path("type").asText()).isEqualTo("function");
        assertThat(tools.get(0).path("function").path("name").asText()).isEqualTo("list_recent_ideas");
        assertThat(tools.get(0).path("function").path("parameters").path("type").asText()).isEqualTo("object");
        assertThat(body.path("tool_choice").asText()).isEqualTo("auto");
    }

    /* --- reflection helpers : on n'expose pas la conversion publiquement --- */

    private ObjectNode invokeBuildRequest(LlmProvider.LlmRequest request) throws Exception {
        Method m = GroqProvider.class.getDeclaredMethod("buildOpenAiRequest", LlmProvider.LlmRequest.class);
        m.setAccessible(true);
        return (ObjectNode) m.invoke(provider, request);
    }

    private LlmProvider.LlmResponse invokeConvertResponse(JsonNode openAi, LlmProvider.LlmRequest request) throws Exception {
        Method m = GroqProvider.class.getDeclaredMethod("convertOpenAiResponse", JsonNode.class, LlmProvider.LlmRequest.class);
        m.setAccessible(true);
        return (LlmProvider.LlmResponse) m.invoke(provider, openAi, request);
    }
}

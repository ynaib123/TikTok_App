package com.tiktokapp.backend.ai.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.ai.AgentTool;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Groq Cloud provider — endpoint OpenAI-compatible {@code /openai/v1/chat/completions}.
 * Convertit les messages format Anthropic content-blocks ({@code type=text|tool_use|tool_result})
 * vers le format OpenAI ({@code tool_calls} array, role={@code tool}) pour l'envoi,
 * puis re-convertit la réponse OpenAI en assistant-message Anthropic-shaped pour rester
 * transparent au {@link com.tiktokapp.backend.ai.AgentOrchestrator} qui itère sur
 * {@code content[].type}.
 *
 * <p>Modèles testés avec tool use : {@code llama-3.3-70b-versatile}, {@code llama-3.1-70b-versatile},
 * {@code mixtral-8x7b-32768}. Le tool use sur ces modèles est correct mais moins fiable
 * que Claude — le system prompt doit être explicite.
 *
 * <p>Free tier : ~14 400 req/jour, 30 req/min sur llama-3.3-70b — largement assez pour
 * du test conversationnel Telegram.
 */
@Component
public class GroqProvider implements LlmProvider {

    private static final Logger logger = LoggerFactory.getLogger(GroqProvider.class);

    private final GroqProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GroqProvider(GroqProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override public String providerName() { return "groq"; }

    @Override
    public boolean isEnabled() {
        return properties.isEnabled() && properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    @Override
    @CircuitBreaker(name = "groq")
    @Retry(name = "groq")
    public LlmResponse send(LlmRequest request) {
        if (!isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Groq provider disabled. Set GROQ_API_KEY and app.groq.enabled=true.");
        }

        ObjectNode body = buildOpenAiRequest(request);

        try {
            String payload = objectMapper.writeValueAsString(body);
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(properties.getBaseUrl() + "/chat/completions"))
                    .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                    .header("content-type", "application/json")
                    .header("authorization", "Bearer " + properties.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                logger.warn("groq call failed status={} body={}", response.statusCode(),
                        response.body() == null ? "" : response.body().substring(0, Math.min(400, response.body().length())));
                throw new ResponseStatusException(mapUpstream(response.statusCode()),
                        "Groq API error " + response.statusCode());
            }
            JsonNode parsed = objectMapper.readTree(response.body());
            return convertOpenAiResponse(parsed, request);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Groq unreachable: " + ex.getMessage(), ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Groq request interrupted", ex);
        }
    }

    /* ──────────────────────── conversion Anthropic → OpenAI ──────────────────────── */

    private ObjectNode buildOpenAiRequest(LlmRequest request) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", request.modelId() == null || request.modelId().isBlank()
                ? properties.getDefaultModelId() : request.modelId());
        body.put("max_tokens", request.maxTokens() > 0 ? request.maxTokens() : properties.getMaxTokens());

        ArrayNode messages = body.putArray("messages");
        // System prompt : un seul message role=system en tête.
        if (request.systemPrompt() != null && !request.systemPrompt().isBlank()) {
            ObjectNode sys = messages.addObject();
            sys.put("role", "system");
            sys.put("content", request.systemPrompt());
        }
        for (JsonNode anthropicMessage : request.messages()) {
            convertAnthropicMessage(anthropicMessage, messages);
        }

        if (request.tools() != null && !request.tools().isEmpty()) {
            ArrayNode toolsArray = body.putArray("tools");
            for (AgentTool tool : request.tools()) {
                ObjectNode entry = toolsArray.addObject();
                entry.put("type", "function");
                ObjectNode fn = entry.putObject("function");
                fn.put("name", tool.name());
                fn.put("description", tool.description());
                fn.set("parameters", tool.inputSchema());
            }
            // Laisse le modèle décider de l'utilisation des tools.
            body.put("tool_choice", "auto");
        }

        return body;
    }

    /**
     * Convertit un message Anthropic en 1+ message OpenAI :
     * <ul>
     *   <li>user content {@code [text]} → user message texte direct.</li>
     *   <li>user content {@code [tool_result, …]} → 1 message {@code role=tool} par bloc tool_result.</li>
     *   <li>assistant content {@code [text, tool_use, …]} → 1 message assistant avec content + tool_calls.</li>
     * </ul>
     */
    private void convertAnthropicMessage(JsonNode anthropicMessage, ArrayNode out) {
        String role = anthropicMessage.path("role").asText();
        JsonNode content = anthropicMessage.path("content");

        if ("user".equals(role)) {
            // Si content[] contient des tool_result, chaque bloc devient un message role=tool séparé.
            // Sinon on concatène les texts en une string.
            boolean hasToolResult = false;
            if (content.isArray()) {
                for (JsonNode block : content) {
                    if ("tool_result".equals(block.path("type").asText())) {
                        ObjectNode toolMsg = out.addObject();
                        toolMsg.put("role", "tool");
                        toolMsg.put("tool_call_id", block.path("tool_use_id").asText(""));
                        // OpenAI veut content en string, Anthropic peut être string ou array. On normalise.
                        JsonNode resultContent = block.path("content");
                        toolMsg.put("content", resultContent.isTextual() ? resultContent.asText() : resultContent.toString());
                        hasToolResult = true;
                    }
                }
            }
            if (hasToolResult) return; // les blocs text d'un message user "tool_result" ne sont pas pertinents

            ObjectNode userMsg = out.addObject();
            userMsg.put("role", "user");
            userMsg.put("content", concatTextBlocks(content));
            return;
        }

        if ("assistant".equals(role)) {
            ObjectNode assistantMsg = out.addObject();
            assistantMsg.put("role", "assistant");
            String text = concatTextBlocks(content);
            // OpenAI exige content même null/vide quand il y a des tool_calls.
            assistantMsg.put("content", text.isEmpty() ? null : text);

            ArrayNode toolCalls = null;
            if (content.isArray()) {
                for (JsonNode block : content) {
                    if ("tool_use".equals(block.path("type").asText())) {
                        if (toolCalls == null) toolCalls = assistantMsg.putArray("tool_calls");
                        ObjectNode tc = toolCalls.addObject();
                        tc.put("id", block.path("id").asText());
                        tc.put("type", "function");
                        ObjectNode fn = tc.putObject("function");
                        fn.put("name", block.path("name").asText());
                        // OpenAI veut arguments en string JSON.
                        fn.put("arguments", block.path("input").toString());
                    }
                }
            }
            return;
        }

        // Rôles inconnus : on les skip plutôt que de tout planter.
        logger.warn("groq convert unknown role={} skipping", role);
    }

    private String concatTextBlocks(JsonNode content) {
        if (content == null || content.isNull()) return "";
        if (content.isTextual()) return content.asText();
        if (!content.isArray()) return "";
        StringBuilder sb = new StringBuilder();
        for (JsonNode block : content) {
            if ("text".equals(block.path("type").asText())) {
                if (sb.length() > 0) sb.append('\n');
                sb.append(block.path("text").asText(""));
            }
        }
        return sb.toString();
    }

    /* ──────────────────────── conversion OpenAI → Anthropic ──────────────────────── */

    /**
     * Réécrit la réponse OpenAI en {@link LlmResponse} avec un message JSON
     * en format Anthropic-content-blocks, pour que l'orchestrator continue
     * à itérer sur {@code content[].type=tool_use} sans changement.
     */
    private LlmResponse convertOpenAiResponse(JsonNode openAi, LlmRequest request) {
        JsonNode choice = openAi.path("choices").path(0);
        JsonNode oaMessage = choice.path("message");
        String finishReason = choice.path("finish_reason").asText("stop");

        ObjectNode anthropicMessage = objectMapper.createObjectNode();
        anthropicMessage.put("role", "assistant");
        ArrayNode contentBlocks = anthropicMessage.putArray("content");

        String text = oaMessage.path("content").isTextual() ? oaMessage.path("content").asText() : "";
        if (!text.isBlank()) {
            ObjectNode textBlock = contentBlocks.addObject();
            textBlock.put("type", "text");
            textBlock.put("text", text);
        }

        JsonNode toolCalls = oaMessage.path("tool_calls");
        if (toolCalls.isArray()) {
            for (JsonNode tc : toolCalls) {
                ObjectNode toolUse = contentBlocks.addObject();
                toolUse.put("type", "tool_use");
                toolUse.put("id", tc.path("id").asText());
                toolUse.put("name", tc.path("function").path("name").asText());
                // Les arguments OpenAI sont une string JSON — on les parse pour respecter
                // l'invariant Anthropic (input doit être un JsonNode object).
                String argsRaw = tc.path("function").path("arguments").asText("{}");
                try {
                    toolUse.set("input", objectMapper.readTree(argsRaw));
                } catch (Exception parse) {
                    logger.warn("groq tool_call arguments not valid JSON, falling back to empty object: {}", argsRaw);
                    toolUse.putObject("input");
                }
            }
        }

        // Mapping des stop reasons : OpenAI tool_calls → Anthropic tool_use ; stop → end_turn ;
        // length → max_tokens ; content_filter → stop_sequence (proche).
        String anthropicStopReason = switch (finishReason) {
            case "tool_calls" -> "tool_use";
            case "length" -> "max_tokens";
            case "content_filter" -> "stop_sequence";
            default -> "end_turn";
        };
        anthropicMessage.put("stop_reason", anthropicStopReason);

        int inTok = openAi.path("usage").path("prompt_tokens").asInt(0);
        int outTok = openAi.path("usage").path("completion_tokens").asInt(0);
        String modelId = openAi.path("model").asText(request.modelId());

        return new LlmResponse(anthropicStopReason, anthropicMessage, inTok, outTok, modelId);
    }

    private HttpStatus mapUpstream(int status) {
        return switch (status) {
            case 401, 403 -> HttpStatus.BAD_GATEWAY;
            case 429       -> HttpStatus.TOO_MANY_REQUESTS;
            case 422       -> HttpStatus.UNPROCESSABLE_ENTITY;
            default        -> HttpStatus.BAD_GATEWAY;
        };
    }
}

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
import java.util.List;

/**
 * Anthropic Messages API provider. Implements the JSON wire format directly
 * via {@link HttpClient} — there is no first-party Java SDK and the existing
 * tooling (Resilience4j circuit breaker, Micrometer) plugs cleanly into a
 * thin client.
 *
 * <p>Endpoint : {@code POST {base-url}/v1/messages}.
 *
 * <p>Headers : {@code x-api-key}, {@code anthropic-version}, {@code content-type}.
 *
 * <p>The provider is gated by Resilience4j's {@code anthropic} circuit breaker
 * and {@code anthropic} retry instances. Both inherit the {@code default}
 * config from {@code application.yml}.
 */
@Component
public class AnthropicProvider implements LlmProvider {

    private static final Logger logger = LoggerFactory.getLogger(AnthropicProvider.class);

    private final AnthropicProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AnthropicProvider(AnthropicProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public String providerName() {
        return "anthropic";
    }

    @Override
    public boolean isEnabled() {
        return properties.isEnabled() && properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    @Override
    @CircuitBreaker(name = "anthropic")
    @Retry(name = "anthropic")
    public LlmResponse send(LlmRequest request) {
        if (!isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Anthropic provider disabled. Set ANTHROPIC_API_KEY and app.anthropic.enabled=true.");
        }
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", request.modelId() == null || request.modelId().isBlank()
                ? properties.getDefaultModelId() : request.modelId());
        body.put("max_tokens", request.maxTokens() > 0 ? request.maxTokens() : properties.getMaxTokens());
        if (request.systemPrompt() != null && !request.systemPrompt().isBlank()) {
            body.put("system", request.systemPrompt());
        }
        ArrayNode messages = body.putArray("messages");
        for (JsonNode message : request.messages()) {
            messages.add(message);
        }
        if (request.tools() != null && !request.tools().isEmpty()) {
            ArrayNode toolsArray = body.putArray("tools");
            for (AgentTool tool : request.tools()) {
                ObjectNode entry = toolsArray.addObject();
                entry.put("name", tool.name());
                entry.put("description", tool.description());
                entry.set("input_schema", tool.inputSchema());
            }
        }

        try {
            String payload = objectMapper.writeValueAsString(body);
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(properties.getBaseUrl() + "/v1/messages"))
                    .timeout(Duration.ofMillis(properties.getReadTimeoutMs()))
                    .header("content-type", "application/json")
                    .header("x-api-key", properties.getApiKey())
                    .header("anthropic-version", properties.getVersion())
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                logger.warn("anthropic call failed status={} body={}", response.statusCode(),
                        response.body() == null ? "" : response.body().substring(0, Math.min(400, response.body().length())));
                throw new ResponseStatusException(mapUpstream(response.statusCode()),
                        "Anthropic API error " + response.statusCode());
            }
            JsonNode parsed = objectMapper.readTree(response.body());
            return new LlmResponse(
                    parsed.path("stop_reason").asText("end_turn"),
                    parsed,
                    parsed.path("usage").path("input_tokens").asInt(0),
                    parsed.path("usage").path("output_tokens").asInt(0),
                    parsed.path("model").asText(request.modelId())
            );
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Anthropic unreachable: " + ex.getMessage(), ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Anthropic request interrupted", ex);
        }
    }

    private HttpStatus mapUpstream(int status) {
        return switch (status) {
            case 401, 403 -> HttpStatus.BAD_GATEWAY;
            case 429       -> HttpStatus.TOO_MANY_REQUESTS;
            case 422       -> HttpStatus.UNPROCESSABLE_ENTITY;
            default        -> HttpStatus.BAD_GATEWAY;
        };
    }

    public int getMaxToolLoopIterations() {
        return properties.getMaxToolLoopIterations();
    }

    public List<AgentTool> noTools() {
        return List.of();
    }
}

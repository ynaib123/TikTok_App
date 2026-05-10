package com.tiktokapp.backend.ai.llm;

import com.tiktokapp.backend.ai.AgentTool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * Route les appels LLM vers le bon provider selon le préfixe du {@code modelId} :
 * <ul>
 *   <li>{@code claude-*} → {@link AnthropicProvider}</li>
 *   <li>{@code llama-*}, {@code mixtral-*}, {@code gemma-*}, {@code groq/*} → {@link GroqProvider}</li>
 * </ul>
 *
 * <p>Marqué {@link Primary} pour être injecté par défaut dans
 * {@link com.tiktokapp.backend.ai.AgentOrchestrator} à la place des providers concrets,
 * sans que l'orchestrator ait besoin de connaître plus d'un implémentation.
 *
 * <p>Si aucun provider ne match (ou si le provider routé est désactivé), tente un
 * fallback vers le premier provider {@link LlmProvider#isEnabled() activé} —
 * permet de "promouvoir" automatiquement Groq quand seul ANTHROPIC_API_KEY est manquant.
 */
@Component
@Primary
public class LlmProviderRouter implements LlmProvider {

    private static final Logger logger = LoggerFactory.getLogger(LlmProviderRouter.class);

    private final AnthropicProvider anthropicProvider;
    private final GroqProvider groqProvider;
    private final AnthropicProperties anthropicProperties;
    private final GroqProperties groqProperties;

    public LlmProviderRouter(
            AnthropicProvider anthropicProvider,
            GroqProvider groqProvider,
            AnthropicProperties anthropicProperties,
            GroqProperties groqProperties
    ) {
        this.anthropicProvider = anthropicProvider;
        this.groqProvider = groqProvider;
        this.anthropicProperties = anthropicProperties;
        this.groqProperties = groqProperties;
    }

    @Override public String providerName() { return "router"; }

    /**
     * Le router est "enabled" dès qu'au moins un provider sous-jacent l'est —
     * permet au {@code AgentOrchestrator} de ne pas refuser tous les runs
     * juste parce qu'Anthropic n'a pas de clé.
     */
    @Override
    public boolean isEnabled() {
        return anthropicProvider.isEnabled() || groqProvider.isEnabled();
    }

    @Override
    public LlmResponse send(LlmRequest request) {
        LlmProvider target = pickProvider(request.modelId());
        LlmRequest forwarded = request;
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Aucun LLM provider activé. Configure ANTHROPIC_API_KEY ou GROQ_API_KEY.");
        }
        if (!target.isEnabled()) {
            LlmProvider fallback = firstEnabled();
            if (fallback == null || fallback == target) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "LLM provider " + target.providerName() + " désactivé et aucun fallback disponible.");
            }
            // Le model id de l'agent (ex: claude-opus-4-7) n'est pas valide pour le
            // provider de fallback (Groq). On substitue par le default model du fallback.
            String fallbackModelId = defaultModelFor(fallback);
            logger.info("llm_router fallback target={} disabled, using {} (model={} -> {})",
                    target.providerName(), fallback.providerName(), request.modelId(), fallbackModelId);
            target = fallback;
            forwarded = new LlmRequest(
                    fallbackModelId,
                    request.systemPrompt(),
                    request.messages(),
                    request.tools(),
                    request.maxTokens()
            );
        }
        return target.send(forwarded);
    }

    private String defaultModelFor(LlmProvider provider) {
        if (provider == anthropicProvider) return anthropicProperties.getDefaultModelId();
        if (provider == groqProvider) return groqProperties.getDefaultModelId();
        return null;
    }

    /** Choix par préfixe du model id. Insensible à la casse. */
    public LlmProvider pickProvider(String modelId) {
        if (modelId == null) return firstEnabled();
        String lc = modelId.toLowerCase(Locale.ROOT);
        if (lc.startsWith("claude-") || lc.startsWith("anthropic/") || lc.startsWith("anthropic-")) {
            return anthropicProvider;
        }
        if (lc.startsWith("llama-") || lc.startsWith("llama_")
                || lc.startsWith("mixtral-") || lc.startsWith("mixtral_")
                || lc.startsWith("gemma-") || lc.startsWith("gemma_")
                || lc.startsWith("groq/")) {
            return groqProvider;
        }
        // Modèles non reconnus : on prend le premier provider activé.
        return firstEnabled();
    }

    private LlmProvider firstEnabled() {
        if (anthropicProvider.isEnabled()) return anthropicProvider;
        if (groqProvider.isEnabled()) return groqProvider;
        return null;
    }

    /** Liste des providers concrets — utile pour les tests + diagnostics. */
    public List<LlmProvider> all() {
        return List.of(anthropicProvider, groqProvider);
    }

    /** Indique si l'agent {@code modelId} ira chez un provider activé. */
    public boolean canRoute(String modelId) {
        LlmProvider target = pickProvider(modelId);
        return target != null && target.isEnabled();
    }

    @SuppressWarnings("unused")
    private List<AgentTool> noTools() { return List.of(); } // for symmetry with AnthropicProvider helper
}

package com.tiktokapp.backend.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Phase 1.2 — Centralised custom metrics for video-ops domain.
 * Inject this bean and call increment/record methods to add observability
 * without scattering Micrometer wiring across services.
 */
@Component
public class VideoOpsMetrics {

    private final MeterRegistry registry;
    private final AtomicInteger activeTikTokAccounts = new AtomicInteger(0);

    public VideoOpsMetrics(MeterRegistry registry) {
        this.registry = registry;
        registry.gauge("tiktok_accounts_active", activeTikTokAccounts);
    }

    public void incrementCallbackFailure(String workflowType) {
        Counter.builder("n8n_callback_failures_total")
                .tag("workflow", workflowType == null ? "unknown" : workflowType)
                .register(registry)
                .increment();
    }

    public void incrementCallbackSuccess(String workflowType) {
        Counter.builder("n8n_callback_success_total")
                .tag("workflow", workflowType == null ? "unknown" : workflowType)
                .register(registry)
                .increment();
    }

    public void recordWorkflowDuration(String workflowType, long durationMillis) {
        Timer.builder("workflow_run_duration")
                .tag("workflow_type", workflowType == null ? "unknown" : workflowType)
                .register(registry)
                .record(durationMillis, TimeUnit.MILLISECONDS);
    }

    public void incrementWorkflowTriggered(String workflowType) {
        Counter.builder("workflow_triggered_total")
                .tag("workflow_type", workflowType == null ? "unknown" : workflowType)
                .register(registry)
                .increment();
    }

    public void incrementContentIdeaDeleted() {
        Counter.builder("content_idea_deleted_total")
                .register(registry)
                .increment();
    }

    public void incrementOAuthRefresh(String result) {
        Counter.builder("tiktok_oauth_refresh_total")
                .tag("result", result == null ? "unknown" : result)
                .register(registry)
                .increment();
    }

    public void incrementQuotaProbe(String provider, String result) {
        Counter.builder("quota_probe_total")
                .tag("provider", provider == null ? "unknown" : provider)
                .tag("result", result == null ? "unknown" : result)
                .register(registry)
                .increment();
    }

    public void setActiveTikTokAccounts(int count) {
        activeTikTokAccounts.set(count);
    }
}

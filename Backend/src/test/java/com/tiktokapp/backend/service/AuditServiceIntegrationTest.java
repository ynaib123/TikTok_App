package com.tiktokapp.backend.service;

import com.tiktokapp.backend.IntegrationTestBase;
import com.tiktokapp.backend.repository.AuditEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smoke test confirming AuditService persists events asynchronously
 * against a real Postgres via Testcontainers (Phase 1.7 + 1.8).
 */
class AuditServiceIntegrationTest extends IntegrationTestBase {

    @Autowired
    private AuditService auditService;

    @Autowired
    private AuditEventRepository repository;

    @Test
    void persistsAuditEvent() {
        long before = repository.count();
        auditService.log("test.event", "test_resource", "42", null);

        await().atMost(2, TimeUnit.SECONDS).untilAsserted(() ->
                assertThat(repository.count()).isGreaterThan(before)
        );
    }
}

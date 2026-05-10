package com.tiktokapp.backend;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Phase 1.7 — base class for integration tests running against
 * a real Postgres in a container. Subclasses inherit
 * spring.datasource.* wiring automatically.
 */
@SpringBootTest
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public abstract class IntegrationTestBase {

    @Container
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("tiktok_app_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void registerDataSourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");

        // Fake but valid secrets so JwtService and friends can boot.
        registry.add("app.security.admin-password", () -> "test-admin-password");
        registry.add("app.security.jwt-secret", () -> "test-jwt-secret-very-long-string-32chars-min");
        registry.add("app.video-ops.internal-api-secret", () -> "test-internal-secret");
        registry.add("app.video-ops.workflow-callback-secret", () -> "test-callback-secret");
        registry.add("app.video-ops.workflow-callback-hmac-secret", () -> "test-hmac-secret");
        registry.add("app.video-ops.token-encryption-key", () -> "test-token-encryption-key-32bytes!");
    }
}

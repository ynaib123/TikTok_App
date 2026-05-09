package com.tiktokapp.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

/**
 * Redis cache + RedisTemplate setup, gated by {@code app.redis.enabled=true}.
 * Disabled by default so the existing dev / CI flows keep working without Redis.
 *
 * <p>Cache regions defined here :
 * <ul>
 *   <li>{@code service-quotas} — short TTL probe results from {@link com.tiktokapp.backend.service.videoops.ServiceQuotaProbe}</li>
 *   <li>{@code admin-sessions} — JWT refresh introspection cache (15 min TTL)</li>
 *   <li>{@code llm-responses} — opportunistic cache for LLM JSON responses by request fingerprint (1h TTL)</li>
 * </ul>
 *
 * <p>Hit/miss metrics flow through the existing Micrometer registry because
 * Spring's RedisCacheManager publishes Cache.* meters automatically.
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(prefix = "app.redis", name = "enabled", havingValue = "true")
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();

        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer));

        Map<String, RedisCacheConfiguration> regions = Map.of(
                "service-quotas", defaults.entryTtl(Duration.ofSeconds(30)),
                "admin-sessions", defaults.entryTtl(Duration.ofMinutes(15)),
                "llm-responses", defaults.entryTtl(Duration.ofHours(1))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(regions)
                .build();
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}

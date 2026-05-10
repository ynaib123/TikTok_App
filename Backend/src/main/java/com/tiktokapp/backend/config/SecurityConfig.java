package com.tiktokapp.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final SecurityProperties securityProperties;
    private final AdminJwtAuthenticationFilter adminJwtAuthenticationFilter;
    private final com.tiktokapp.backend.web.security.RateLimitFilter rateLimitFilter;
    private final com.tiktokapp.backend.web.security.InternalSecretFilter internalSecretFilter;

    public SecurityConfig(
            SecurityProperties securityProperties,
            AdminJwtAuthenticationFilter adminJwtAuthenticationFilter,
            com.tiktokapp.backend.web.security.RateLimitFilter rateLimitFilter,
            com.tiktokapp.backend.web.security.InternalSecretFilter internalSecretFilter
    ) {
        this.securityProperties = securityProperties;
        this.adminJwtAuthenticationFilter = adminJwtAuthenticationFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.internalSecretFilter = internalSecretFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // httpOnly(false) : requis pour les SPA React. Le cookie XSRF-TOKEN doit
        // être lisible par JS afin que le frontend puisse le lire et l'envoyer
        // dans le header X-XSRF-TOKEN. C'est l'approche standard Angular/React/Vue.
        // maxAge 24h : évite de perdre le cookie à la fermeture du navigateur.
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookieCustomizer(cookie -> cookie
                .httpOnly(false)
                .sameSite("Lax")
                .maxAge(86400));

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .ignoringRequestMatchers(
                                "/api/admins/refresh",
                                "/api/video-ops/workflow-runs/*/complete",
                                "/api/video-ops/workflows/**",
                                "/api/video-ops/content-ideas/*/upload",
                                "/api/video-ops/content-ideas/*/publish",
                                "/api/video-ops/content-ideas/batch-publish",
                                "/api/video-ops/internal/**",
                                "/api/video-ops/internal/tiktok/init-publish-context",
                                "/api/video-ops/internal/tiktok/account-context",
                                "/api/video-ops/internal/groq/chat-completions",
                                "/api/video-ops/internal/pexels/videos/search",
                                "/api/video-ops/accounts/**",
                                "/api/ai/agents/*/run",
                                "/api/audio/**"
                        )
                )
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .headers(headers -> headers
                        .contentTypeOptions(Customizer.withDefaults())
                        .frameOptions(frame -> frame.deny())
                        // X-XSS-Protection: 0 = guidance moderne (Chromium a retire l'XSS auditor,
                        // les implementations heritees etaient elles-memes exploitables).
                        .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.DISABLED))
                        .referrerPolicy(ref -> ref.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicyHeader(perm -> perm.policy("camera=(), microphone=(), geolocation=(), payment=()"))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000)
                        )
                        // CSP : backend sert essentiellement du JSON. Les exceptions 'unsafe-inline'
                        // sont la pour Swagger UI (dev) et pages d'erreur whitelabel Spring Boot.
                        // En prod, Swagger est desactive (application-prod.yml) donc l'API reelle
                        // exposee ne consomme pas l'unsafe-inline.
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; "
                                        + "script-src 'self' 'unsafe-inline'; "
                                        + "style-src 'self' 'unsafe-inline'; "
                                        + "img-src 'self' data: https:; "
                                        + "font-src 'self' data:; "
                                        + "connect-src 'self'; "
                                        + "frame-ancestors 'none'; "
                                        + "base-uri 'self'; "
                                        + "form-action 'self'; "
                                        + "object-src 'none'"
                        ))
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Endpoints publics : auth admin, callbacks n8n, actuator de base
                        .requestMatchers(
                                "/api/admins/csrf-token",
                                "/api/admins/login",
                                "/api/admins/refresh",
                                "/api/admins/logout",
                                "/api/video-ops/workflow-runs/*/complete",
                                // /internal/** : HTTP layer permissif ici ; protection garantie par InternalSecretFilter
                                "/api/video-ops/internal/**",
                                "/actuator/health",
                                "/actuator/info",
                                // Prometheus : laisser public ici, restreindre via réseau/reverse-proxy en prod
                                // ou activer management.server.port dans application-prod.yml
                                "/actuator/prometheus"
                        ).permitAll()
                        // Swagger : autorisé uniquement si springdoc est actif (désactivé en profil prod)
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        // Toute autre route est refusée : pas de surface ouverte par défaut
                        .anyRequest().denyAll()
                )
                .addFilterBefore(internalSecretFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(adminJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(securityProperties.getAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN", "X-Trace-Id"));
        configuration.setExposedHeaders(List.of("Set-Cookie", "X-Trace-Id", "Server-Timing"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

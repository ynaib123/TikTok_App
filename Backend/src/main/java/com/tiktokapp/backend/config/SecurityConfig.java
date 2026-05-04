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

    public SecurityConfig(
            SecurityProperties securityProperties,
            AdminJwtAuthenticationFilter adminJwtAuthenticationFilter
    ) {
        this.securityProperties = securityProperties;
        this.adminJwtAuthenticationFilter = adminJwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrfTokenRepository = new CookieCsrfTokenRepository();
        csrfTokenRepository.setCookieCustomizer(cookie -> cookie.httpOnly(true));

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
                                "/api/video-ops/internal/shotstack/render",
                                "/api/video-ops/internal/shotstack/render/*",
                                "/api/video-ops/accounts/**"
                        )
                )
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/api/admins/csrf-token",
                                "/api/admins/login",
                                "/api/admins/refresh",
                                "/api/admins/logout",
                                "/api/video-ops/workflow-runs/*/complete",
                                "/api/video-ops/internal/**",
                                "/api/video-ops/internal/tiktok/init-publish-context",
                                "/api/video-ops/internal/tiktok/account-context",
                                "/api/video-ops/internal/groq/chat-completions",
                                "/api/video-ops/internal/pexels/videos/search",
                                "/api/video-ops/internal/shotstack/render",
                                "/api/video-ops/internal/shotstack/render/*"
                        ).permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(adminJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(securityProperties.getAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

package com.tiktokapp.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI tiktokAppOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("TikTok App Admin API")
                        .description("Backoffice API for TikTok content automation: ideas, workflows, accounts, callbacks.")
                        .version("v1")
                        .contact(new Contact().name("TikTok App Team"))
                        .license(new License().name("Proprietary")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT"))
                        .addSecuritySchemes("internalSecret",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.APIKEY)
                                        .in(SecurityScheme.In.HEADER)
                                        .name("X-Internal-Secret")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}

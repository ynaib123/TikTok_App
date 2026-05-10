package com.tiktokapp.backend;

import com.tiktokapp.backend.ai.llm.AnthropicProperties;
import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.config.ElevenLabsProperties;
import com.tiktokapp.backend.config.RateLimitProperties;
import com.tiktokapp.backend.config.SecurityProperties;
import com.tiktokapp.backend.config.TikTokSoundProperties;
import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// Exclut UserDetailsServiceAutoConfiguration : l'app utilise un AdminJwtAuthenticationFilter
// custom + AdminUserService (DB). L'auto-config Spring génère un mot de passe aléatoire
// au boot (warning bruyant) pour un InMemoryUserDetailsManager qu'on n'utilise pas.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
@EnableAsync
@EnableConfigurationProperties({SecurityProperties.class, VideoOpsProperties.class, AlertingProperties.class, RateLimitProperties.class, ElevenLabsProperties.class, AnthropicProperties.class, TikTokSoundProperties.class})
public class TikTokAppBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TikTokAppBackendApplication.class, args);
    }
}

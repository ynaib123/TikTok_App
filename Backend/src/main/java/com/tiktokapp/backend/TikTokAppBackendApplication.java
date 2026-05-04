package com.tiktokapp.backend;

import com.tiktokapp.backend.config.AlertingProperties;
import com.tiktokapp.backend.config.SecurityProperties;
import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({SecurityProperties.class, VideoOpsProperties.class, AlertingProperties.class})
public class TikTokAppBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TikTokAppBackendApplication.class, args);
    }
}

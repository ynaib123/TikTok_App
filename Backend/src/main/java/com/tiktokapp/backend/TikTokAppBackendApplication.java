package com.tiktokapp.backend;

import com.tiktokapp.backend.config.SecurityProperties;
import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({SecurityProperties.class, VideoOpsProperties.class})
public class TikTokAppBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TikTokAppBackendApplication.class, args);
    }
}

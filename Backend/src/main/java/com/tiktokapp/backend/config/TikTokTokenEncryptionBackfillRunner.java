package com.tiktokapp.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.service.videoops.ContentIdeaGateway;
import com.tiktokapp.backend.service.videoops.VideoOpsCryptoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
@Profile("!dev")
public class TikTokTokenEncryptionBackfillRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(TikTokTokenEncryptionBackfillRunner.class);

    private final VideoOpsCryptoService cryptoService;
    private final ContentIdeaGateway contentIdeaGateway;

    public TikTokTokenEncryptionBackfillRunner(
            VideoOpsCryptoService cryptoService,
            ContentIdeaGateway contentIdeaGateway
    ) {
        this.cryptoService = cryptoService;
        this.contentIdeaGateway = contentIdeaGateway;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!cryptoService.isConfigured()) {
            logger.info("video_ops token encryption backfill skipped because APP_VIDEO_OPS_TOKEN_ENCRYPTION_KEY is not configured");
            return;
        }

        try {
            JsonNode rows = contentIdeaGateway.fetchTikTokAccountsForEncryptionMigration();
            if (!rows.isArray() || rows.isEmpty()) {
                logger.info("video_ops token encryption backfill found no TikTok accounts to inspect");
                return;
            }

            int migratedCount = 0;
            for (JsonNode row : rows) {
                long accountId = row.path("id").asLong();
                String accessToken = trimToNull(row.path("access_token").asText(""));
                String refreshToken = trimToNull(row.path("refresh_token").asText(""));

                Map<String, Object> patch = new LinkedHashMap<>();
                if (accessToken != null && !cryptoService.isEncrypted(accessToken)) {
                    patch.put("access_token", cryptoService.encryptIfConfigured(accessToken));
                }
                if (refreshToken != null && !cryptoService.isEncrypted(refreshToken)) {
                    patch.put("refresh_token", cryptoService.encryptIfConfigured(refreshToken));
                }

                if (!patch.isEmpty()) {
                    contentIdeaGateway.updateTikTokAccount(accountId, patch);
                    migratedCount++;
                }
            }

            logger.info("video_ops token encryption backfill completed migratedAccounts={}", migratedCount);
        } catch (Exception exception) {
            logger.warn("video_ops token encryption backfill skipped because TikTok accounts could not be read safely", exception);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

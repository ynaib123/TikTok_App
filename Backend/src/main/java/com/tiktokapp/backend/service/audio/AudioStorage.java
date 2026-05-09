package com.tiktokapp.backend.service.audio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.UUID;

/**
 * Persists generated audio bytes to local disk under {@code app.elevenlabs.storage-path}.
 * Returns a URL that the RenderVideo service can resolve via the
 * {@code APP_VIDEO_OPS_RENDER_VIDEO_BASE_URL} -> shared volume mapping in
 * {@code docker-compose.yml}.
 *
 * <p>Today the URL is a {@code file://} pointer because Remotion can ingest local
 * paths directly when both services share the volume. Switching to R2 means
 * replacing the {@code persist} body with a {@code S3Client.putObject} call and
 * returning the public R2 URL — no caller change required.
 */
@Component
public class AudioStorage {

    private static final Logger logger = LoggerFactory.getLogger(AudioStorage.class);

    private final Path storageRoot;
    private final String publicBaseUrl;

    public AudioStorage(
            @Value("${app.elevenlabs.storage-path:/app/audio-assets}") String storagePath,
            @Value("${app.elevenlabs.public-base-url:}") String publicBaseUrl
    ) {
        this.storageRoot = Path.of(storagePath);
        this.publicBaseUrl = publicBaseUrl == null ? "" : publicBaseUrl.replaceAll("/+$", "");
        try {
            Files.createDirectories(storageRoot);
        } catch (IOException ex) {
            logger.warn("audio_storage init failed for {} — falling back to runtime mkdir : {}",
                    storageRoot, ex.getMessage());
        }
    }

    public String persist(Long contentIdeaId, String voiceId, byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "ElevenLabs returned an empty audio payload.");
        }
        String filename = "idea-" + contentIdeaId + "-" + voiceId + "-"
                + Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + ".mp3";
        Path target = storageRoot.resolve(filename);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible d'écrire l'asset audio sur le disque.", ex);
        }
        if (publicBaseUrl.isEmpty()) {
            return target.toUri().toString();
        }
        return publicBaseUrl + "/audio-assets/" + filename;
    }
}

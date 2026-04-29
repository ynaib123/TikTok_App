package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class VideoOpsCryptoService {

    private static final String PREFIX = "enc::v1::";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_LENGTH = 12;

    private final VideoOpsProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public VideoOpsCryptoService(VideoOpsProperties properties) {
        this.properties = properties;
    }

    public String encryptIfConfigured(String rawValue) {
        if (isBlank(rawValue) || !isConfigured()) {
            return rawValue;
        }
        if (isEncrypted(rawValue)) {
            return rawValue;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(deriveKey(), "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(rawValue.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherText.length);
            buffer.put(iv);
            buffer.put(cipherText);
            return PREFIX + Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de chiffrer le token TikTok.", exception);
        }
    }

    public String decryptIfNeeded(String persistedValue) {
        if (isBlank(persistedValue) || !isEncrypted(persistedValue)) {
            return persistedValue;
        }
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "La cle de chiffrement video ops est manquante.");
        }
        try {
            byte[] payload = Base64.getDecoder().decode(persistedValue.substring(PREFIX.length()));
            ByteBuffer buffer = ByteBuffer.wrap(payload);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(deriveKey(), "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de dechiffrer le token TikTok.", exception);
        }
    }

    public boolean isConfigured() {
        return !isBlank(properties.getTokenEncryptionKey());
    }

    public boolean isEncrypted(String persistedValue) {
        return persistedValue != null && persistedValue.startsWith(PREFIX);
    }

    private byte[] deriveKey() throws Exception {
        return MessageDigest.getInstance("SHA-256")
                .digest(properties.getTokenEncryptionKey().getBytes(StandardCharsets.UTF_8));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

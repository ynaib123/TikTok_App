package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VideoOpsCryptoServiceTest {

    private VideoOpsProperties properties;
    private VideoOpsCryptoService service;

    @BeforeEach
    void setUp() {
        properties = new VideoOpsProperties();
        properties.setTokenEncryptionKey("strong-test-key-for-aes-gcm-derivation-2026");
        service = new VideoOpsCryptoService(properties);
    }

    @Test
    void encryptThenDecrypt_returnsOriginalValue() {
        String plain = "tiktok_access_token_value_xyz";

        String encrypted = service.encryptIfConfigured(plain);
        String decrypted = service.decryptIfNeeded(encrypted);

        assertThat(encrypted).startsWith("enc::v1::");
        assertThat(encrypted).isNotEqualTo(plain);
        assertThat(decrypted).isEqualTo(plain);
    }

    @Test
    void encrypt_producesDifferentCiphertextEachCall_thanksToRandomIv() {
        String plain = "same-plaintext";

        String first = service.encryptIfConfigured(plain);
        String second = service.encryptIfConfigured(plain);

        assertThat(first).isNotEqualTo(second);
        assertThat(service.decryptIfNeeded(first)).isEqualTo(plain);
        assertThat(service.decryptIfNeeded(second)).isEqualTo(plain);
    }

    @Test
    void encryptIfConfigured_returnsValueAsIs_whenAlreadyEncrypted() {
        String plain = "abc";
        String encrypted = service.encryptIfConfigured(plain);

        String reencrypted = service.encryptIfConfigured(encrypted);

        assertThat(reencrypted).isEqualTo(encrypted);
    }

    @Test
    void encryptIfConfigured_returnsRawValue_whenKeyMissing() {
        properties.setTokenEncryptionKey("");

        String result = service.encryptIfConfigured("plain");

        assertThat(result).isEqualTo("plain");
    }

    @Test
    void encryptIfConfigured_returnsBlankInputUnchanged() {
        assertThat(service.encryptIfConfigured(null)).isNull();
        assertThat(service.encryptIfConfigured("")).isEqualTo("");
        assertThat(service.encryptIfConfigured("   ")).isEqualTo("   ");
    }

    @Test
    void decryptIfNeeded_returnsValueAsIs_whenNotEncrypted() {
        assertThat(service.decryptIfNeeded("plain-value")).isEqualTo("plain-value");
        assertThat(service.decryptIfNeeded(null)).isNull();
        assertThat(service.decryptIfNeeded("")).isEqualTo("");
    }

    @Test
    void decryptIfNeeded_throws503_whenKeyMissingButPayloadEncrypted() {
        String encrypted = service.encryptIfConfigured("secret");

        properties.setTokenEncryptionKey("");

        assertThatThrownBy(() -> service.decryptIfNeeded(encrypted))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }

    @Test
    void decryptIfNeeded_throws500_whenCiphertextTampered() {
        String encrypted = service.encryptIfConfigured("secret");

        // Modifie le dernier byte du ciphertext (apres le prefixe)
        String body = encrypted.substring("enc::v1::".length());
        byte[] payload = Base64.getDecoder().decode(body);
        payload[payload.length - 1] ^= 0x01;
        String tampered = "enc::v1::" + Base64.getEncoder().encodeToString(payload);

        assertThatThrownBy(() -> service.decryptIfNeeded(tampered))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("500");
    }

    @Test
    void decryptIfNeeded_throws500_whenIvTampered() {
        String encrypted = service.encryptIfConfigured("secret");

        String body = encrypted.substring("enc::v1::".length());
        byte[] payload = Base64.getDecoder().decode(body);
        payload[0] ^= 0x01;
        String tampered = "enc::v1::" + Base64.getEncoder().encodeToString(payload);

        assertThatThrownBy(() -> service.decryptIfNeeded(tampered))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void decryptIfNeeded_throws500_whenPayloadIsNotBase64() {
        String invalid = "enc::v1::!!!not-base64!!!";

        assertThatThrownBy(() -> service.decryptIfNeeded(invalid))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void decryptIfNeeded_throws_whenWrongKeyUsed() {
        String encrypted = service.encryptIfConfigured("secret");

        properties.setTokenEncryptionKey("a-different-key-than-the-encryption-one");

        assertThatThrownBy(() -> service.decryptIfNeeded(encrypted))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void isConfigured_reflectsTokenEncryptionKey() {
        assertThat(service.isConfigured()).isTrue();

        properties.setTokenEncryptionKey("");
        assertThat(service.isConfigured()).isFalse();

        properties.setTokenEncryptionKey("   ");
        assertThat(service.isConfigured()).isFalse();
    }

    @Test
    void isEncrypted_detectsPrefix() {
        assertThat(service.isEncrypted(null)).isFalse();
        assertThat(service.isEncrypted("")).isFalse();
        assertThat(service.isEncrypted("plain")).isFalse();
        assertThat(service.isEncrypted("enc::v1::")).isTrue();
        assertThat(service.isEncrypted("enc::v1::abcdef")).isTrue();
    }
}

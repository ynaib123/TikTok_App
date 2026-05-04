package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.model.TikTokAccount;
import com.tiktokapp.backend.repository.TikTokAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;

@Service
public class TikTokTokenRefreshService {

    private static final Duration EXPIRY_SAFETY_WINDOW = Duration.ofMinutes(10);

    private final TikTokAccountRepository tiktokAccountRepository;
    private final TikTokOAuthService tikTokOAuthService;
    private final VideoOpsCryptoService cryptoService;

    public TikTokTokenRefreshService(
            TikTokAccountRepository tiktokAccountRepository,
            TikTokOAuthService tikTokOAuthService,
            VideoOpsCryptoService cryptoService
    ) {
        this.tiktokAccountRepository = tiktokAccountRepository;
        this.tikTokOAuthService = tikTokOAuthService;
        this.cryptoService = cryptoService;
    }

    @Transactional
    public TikTokAccount ensureValidAccessToken(String openId) {
        String normalizedOpenId = trimToNull(openId);
        if (normalizedOpenId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tiktokAccountOpenId est obligatoire.");
        }

        TikTokAccount account = tiktokAccountRepository.findFirstByOpenIdForUpdate(normalizedOpenId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun compte TikTok correspondant a cet open_id."));

        if (!requiresRefresh(account, Instant.now())) {
            return account;
        }

        return refreshAccessToken(account);
    }

    @Transactional
    public TikTokAccount refreshAccessToken(long accountId) {
        TikTokAccount account = tiktokAccountRepository.findByIdForUpdate(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "compte TikTok introuvable."));
        return refreshAccessToken(account);
    }

    public boolean isCloseToExpiry(TikTokAccount account) {
        return requiresRefresh(account, Instant.now());
    }

    private TikTokAccount refreshAccessToken(TikTokAccount account) {
        Instant now = Instant.now();
        String decryptedRefreshToken = cryptoService.decryptIfNeeded(trimToNull(account.getRefreshToken()));
        if (decryptedRefreshToken == null) {
            return markExpiredAndThrow(account, "Le compte TikTok n'a pas de refresh_token exploitable.");
        }

        Instant refreshTokenExpiresAt = account.getRefreshTokenExpiresAt();
        if (refreshTokenExpiresAt != null && !refreshTokenExpiresAt.isAfter(now.plus(EXPIRY_SAFETY_WINDOW))) {
            return markExpiredAndThrow(account, "Le refresh_token TikTok est expire.");
        }

        try {
            JsonNode refreshPayload = tikTokOAuthService.refreshAccessToken(decryptedRefreshToken);
            applyTokenPayload(account, refreshPayload, now);
            return tiktokAccountRepository.save(account);
        } catch (ResponseStatusException exception) {
            String message = trimToNull(exception.getReason()) != null ? exception.getReason() : "Le refresh TikTok a echoue.";
            markAsExpired(account, message, now);
            tiktokAccountRepository.save(account);
            throw exception;
        } catch (RuntimeException exception) {
            String message = trimToNull(exception.getMessage()) != null ? exception.getMessage() : "Le refresh TikTok a echoue.";
            markAsExpired(account, message, now);
            tiktokAccountRepository.save(account);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Impossible de rafraichir le token TikTok.", exception);
        }
    }

    public void applyTokenPayload(TikTokAccount account, JsonNode tokenPayload, Instant now) {
        String accessToken = requiredText(tokenPayload, "access_token");
        String refreshToken = requiredText(tokenPayload, "refresh_token");
        String openId = requiredText(tokenPayload, "open_id");
        String tokenType = requiredText(tokenPayload, "token_type");
        String scope = requiredText(tokenPayload, "scope");

        account.setOpenId(openId);
        account.setAccessToken(cryptoService.encryptIfConfigured(accessToken));
        account.setRefreshToken(cryptoService.encryptIfConfigured(refreshToken));
        account.setTokenType(tokenType);
        account.setScope(scope);
        account.setAccessTokenExpiresAt(resolveExpiry(tokenPayload, "expires_in", now, Duration.ofHours(24)));
        account.setRefreshTokenExpiresAt(resolveExpiry(tokenPayload, "refresh_expires_in", now, null));
        account.setLastTokenRefreshAt(now);
        account.setLastTokenRefreshError(null);
        account.setTokenStatus(TikTokAccount.TokenStatus.ACTIVE);
    }

    private boolean requiresRefresh(TikTokAccount account, Instant now) {
        if (account.getTokenStatus() == TikTokAccount.TokenStatus.TOKEN_EXPIRED) {
            return true;
        }

        String decryptedAccessToken = cryptoService.decryptIfNeeded(trimToNull(account.getAccessToken()));
        if (decryptedAccessToken == null) {
            return true;
        }

        Instant accessTokenExpiresAt = account.getAccessTokenExpiresAt();
        if (accessTokenExpiresAt == null) {
            account.setTokenStatus(TikTokAccount.TokenStatus.TOKEN_REFRESH_REQUIRED);
            return true;
        }

        if (!accessTokenExpiresAt.isAfter(now.plus(EXPIRY_SAFETY_WINDOW))) {
            account.setTokenStatus(TikTokAccount.TokenStatus.TOKEN_REFRESH_REQUIRED);
            return true;
        }

        account.setTokenStatus(TikTokAccount.TokenStatus.ACTIVE);
        return false;
    }

    private Instant resolveExpiry(JsonNode payload, String fieldName, Instant now, Duration fallback) {
        JsonNode field = payload.path(fieldName);
        if (field.isNumber()) {
            long seconds = field.asLong();
            if (seconds > 0) {
                return now.plusSeconds(seconds);
            }
        }
        return fallback == null ? null : now.plus(fallback);
    }

    private void markAsExpired(TikTokAccount account, String message, Instant now) {
        account.setTokenStatus(TikTokAccount.TokenStatus.TOKEN_EXPIRED);
        account.setLastTokenRefreshAt(now);
        account.setLastTokenRefreshError(trimToNull(message));
    }

    private TikTokAccount markExpiredAndThrow(TikTokAccount account, String message) {
        markAsExpired(account, message, Instant.now());
        tiktokAccountRepository.save(account);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED");
    }

    private String requiredText(JsonNode payload, String fieldName) {
        String value = trimToNull(payload.path(fieldName).asText(""));
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Reponse TikTok incomplete: " + fieldName + " manquant.");
        }
        return value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

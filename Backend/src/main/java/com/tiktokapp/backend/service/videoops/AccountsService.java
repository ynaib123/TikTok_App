package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.tiktokapp.backend.dto.videoops.AccountsOverviewResponse;
import com.tiktokapp.backend.dto.videoops.AccountsReadinessResponse;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionRequest;
import com.tiktokapp.backend.dto.videoops.ServiceConnectionResponse;
import com.tiktokapp.backend.dto.videoops.TikTokAccountResponse;
import com.tiktokapp.backend.model.ServiceConnection;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import com.tiktokapp.backend.model.ServiceConnectionStatus;
import com.tiktokapp.backend.model.ServiceConnectionValidationStatus;
import com.tiktokapp.backend.repository.ServiceConnectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class AccountsService {

    private static final Logger logger = LoggerFactory.getLogger(AccountsService.class);

    private final ServiceConnectionRepository serviceConnectionRepository;
    private final ContentIdeaGateway contentIdeaGateway;
    private final VideoOpsCryptoService cryptoService;
    private final VideoOpsService videoOpsService;
    private final ServiceConnectionGatewayService gatewayService;

    public AccountsService(
            ServiceConnectionRepository serviceConnectionRepository,
            ContentIdeaGateway contentIdeaGateway,
            VideoOpsCryptoService cryptoService,
            VideoOpsService videoOpsService,
            ServiceConnectionGatewayService gatewayService
    ) {
        this.serviceConnectionRepository = serviceConnectionRepository;
        this.contentIdeaGateway = contentIdeaGateway;
        this.cryptoService = cryptoService;
        this.videoOpsService = videoOpsService;
        this.gatewayService = gatewayService;
    }

    public AccountsOverviewResponse fetchOverview() {
        List<TikTokAccountResponse> tiktokAccounts = safelyFetchTikTokAccounts();
        List<ServiceConnectionResponse> serviceConnections = serviceConnectionRepository.findAllByOrderByProviderKeyAscActiveDescIdDesc().stream()
                .filter(c -> c.getProviderKey() != ServiceConnectionProvider.N8N)
                .map(this::toResponse)
                .toList();
        return new AccountsOverviewResponse(
                tiktokAccounts,
                serviceConnections,
                buildReadiness(tiktokAccounts, serviceConnections)
        );
    }

    public AccountsReadinessResponse fetchReadiness() {
        List<TikTokAccountResponse> tiktokAccounts = safelyFetchTikTokAccounts();
        List<ServiceConnectionResponse> serviceConnections = serviceConnectionRepository.findAllByOrderByProviderKeyAscActiveDescIdDesc().stream()
                .filter(c -> c.getProviderKey() != ServiceConnectionProvider.N8N)
                .map(this::toResponse)
                .toList();
        return buildReadiness(tiktokAccounts, serviceConnections);
    }

    @Transactional
    public ServiceConnectionResponse upsertServiceConnection(String providerKey, ServiceConnectionRequest request) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        validateProviderConfiguration(provider, request);
        ServiceConnection connection = resolveConnectionForUpsert(provider, request.getConnectionId());

        connection.setDisplayName(trimToNull(request.getDisplayName()));
        connection.setBaseUrl(trimToNull(request.getBaseUrl()));
        connection.setAccountIdentifier(trimToNull(request.getAccountIdentifier()));
        connection.setMetadataJson(trimToNull(request.getMetadataJson()));
        String secretValue = trimToNull(request.getSecretValue());
        if (secretValue != null) {
            connection.setSecretValue(cryptoService.encryptIfConfigured(secretValue));
        }

        String resolvedSecret = trimToNull(request.getSecretValue()) != null
                ? trimToNull(request.getSecretValue())
                : cryptoService.decryptIfNeeded(trimToNull(connection.getSecretValue()));
        if (providerRequiresSecret(provider) && resolvedSecret == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le secret du service " + provider.name() + " est obligatoire.");
        }

        ServiceConnectionValidationResult validationResult = gatewayService.validate(
                provider,
                trimToNull(request.getBaseUrl()),
                resolvedSecret,
                trimToNull(request.getAccountIdentifier())
        );

        connection.setStatus(ServiceConnectionStatus.CONNECTED);
        connection.setActive(true);
        if (connection.getConnectedAt() == null) {
            connection.setConnectedAt(Instant.now());
        }
        connection.setLastValidatedAt(Instant.now());
        connection.setLastValidationStatus(validationResult.status());
        connection.setLastValidationMessage(trimToNull(validationResult.message()));
        serviceConnectionRepository.save(connection);
        deactivateOtherConnections(provider, connection.getId());
        return toResponse(connection);
    }

    @Transactional
    public ServiceConnectionResponse activateServiceConnection(String providerKey, long connectionId) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        ServiceConnection connection = serviceConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service connection introuvable."));
        if (connection.getProviderKey() != provider) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le profil ne correspond pas au provider demande.");
        }
        String secretValue = cryptoService.decryptIfNeeded(trimToNull(connection.getSecretValue()));
        if (providerRequiresSecret(provider) && secretValue == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le secret du profil selectionne est manquant.");
        }
        ServiceConnectionValidationResult validationResult = gatewayService.validate(
                provider,
                trimToNull(connection.getBaseUrl()),
                secretValue,
                trimToNull(connection.getAccountIdentifier())
        );
        deactivateOtherConnections(provider, connection.getId());
        connection.setActive(true);
        connection.setStatus(ServiceConnectionStatus.CONNECTED);
        connection.setLastValidatedAt(Instant.now());
        connection.setLastValidationStatus(validationResult.status());
        connection.setLastValidationMessage(trimToNull(validationResult.message()));
        serviceConnectionRepository.save(connection);
        return toResponse(connection);
    }

    @Transactional
    public ServiceConnectionResponse validateServiceConnection(String providerKey, long connectionId) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        ServiceConnection connection = serviceConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service connection introuvable."));
        if (connection.getProviderKey() != provider) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le profil ne correspond pas au provider demande.");
        }
        String secretValue = cryptoService.decryptIfNeeded(trimToNull(connection.getSecretValue()));
        if (providerRequiresSecret(provider) && secretValue == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le secret du profil selectionne est manquant.");
        }
        ServiceConnectionValidationResult validationResult = gatewayService.validate(
                provider,
                trimToNull(connection.getBaseUrl()),
                secretValue,
                trimToNull(connection.getAccountIdentifier())
        );
        connection.setLastValidatedAt(Instant.now());
        connection.setLastValidationStatus(validationResult.status());
        connection.setLastValidationMessage(trimToNull(validationResult.message()));
        if (validationResult.status() == ServiceConnectionValidationStatus.VALID) {
            connection.setStatus(ServiceConnectionStatus.CONNECTED);
        }
        serviceConnectionRepository.save(connection);
        return toResponse(connection);
    }

    @Transactional
    public void disconnectServiceConnection(String providerKey) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        ServiceConnection connection = serviceConnectionRepository.findFirstByProviderKeyAndActiveTrue(provider)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service connection active introuvable."));
        deleteServiceConnection(providerKey, connection.getId());
    }

    @Transactional
    public void deleteServiceConnection(String providerKey, long connectionId) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        ServiceConnection connection = serviceConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service connection introuvable."));
        if (connection.getProviderKey() != provider) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le profil ne correspond pas au provider demande.");
        }

        serviceConnectionRepository.delete(connection);
    }

    @Transactional
    public void disconnectTikTokAccount(long accountId) {
        contentIdeaGateway.deleteTikTokAccount(accountId);
    }

    private AccountsReadinessResponse buildReadiness(
            List<TikTokAccountResponse> tiktokAccounts,
            List<ServiceConnectionResponse> serviceConnections
    ) {
        List<String> missingItems = new ArrayList<>();
        if (tiktokAccounts == null || tiktokAccounts.isEmpty()) {
            missingItems.add("TikTok");
        }

        // n8n is no longer a user-managed connection (configured in application.yml).
        for (ServiceConnectionProvider provider : Arrays.asList(
                ServiceConnectionProvider.GROQ,
                ServiceConnectionProvider.SHOTSTACK,
                ServiceConnectionProvider.PEXELS
        )) {
            boolean connected = serviceConnections.stream().anyMatch(connection ->
                    provider.name().equalsIgnoreCase(connection.getProviderKey())
                            && connection.isActive()
                            && "CONNECTED".equalsIgnoreCase(connection.getStatus())
                            && (!providerRequiresSecret(provider) || connection.isHasSecret())
                            && "VALID".equalsIgnoreCase(connection.getValidationStatus())
            );
            if (!connected) {
                missingItems.add(prettyProviderName(provider));
            }
        }

        return new AccountsReadinessResponse(
                missingItems.isEmpty(),
                tiktokAccounts == null ? 0 : tiktokAccounts.size(),
                missingItems
        );
    }

    private ServiceConnectionProvider parseProvider(String providerKey) {
        try {
            return ServiceConnectionProvider.valueOf(String.valueOf(providerKey).trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "providerKey de service invalide.");
        }
    }

    private ServiceConnectionResponse toResponse(ServiceConnection connection) {
        return new ServiceConnectionResponse(
                connection.getId(),
                connection.getProviderKey() == null ? null : connection.getProviderKey().name(),
                connection.getDisplayName(),
                connection.getBaseUrl(),
                connection.getAccountIdentifier(),
                connection.getMetadataJson(),
                trimToNull(connection.getSecretValue()) != null,
                connection.getStatus() == null ? ServiceConnectionStatus.DISCONNECTED.name() : connection.getStatus().name(),
                connection.isActive(),
                connection.getLastValidationStatus() == null ? ServiceConnectionValidationStatus.UNKNOWN.name() : connection.getLastValidationStatus().name(),
                trimToNull(connection.getLastValidationMessage()),
                connection.getConnectedAt() == null ? null : connection.getConnectedAt().toString(),
                connection.getLastValidatedAt() == null ? null : connection.getLastValidatedAt().toString()
        );
    }

    private String prettyProviderName(ServiceConnectionProvider provider) {
        return switch (provider) {
            case N8N -> "n8n";
            case GROQ -> "Groq";
            case PEXELS -> "Pexels";
            case SUPABASE -> "Supabase";
            case SHOTSTACK -> "Shotstack";
        };
    }

    private List<TikTokAccountResponse> safelyFetchTikTokAccounts() {
        try {
            return videoOpsService.fetchTikTokAccounts();
        } catch (ResponseStatusException exception) {
            logger.warn("accounts overview could not fetch TikTok accounts and will fall back to an empty list", exception);
            return List.of();
        }
    }

    private boolean providerRequiresSecret(ServiceConnectionProvider provider) {
        return provider != ServiceConnectionProvider.N8N;
    }

    private void validateProviderConfiguration(ServiceConnectionProvider provider, ServiceConnectionRequest request) {
        String baseUrl = trimToNull(request.getBaseUrl());
        if (baseUrl == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl est obligatoire.");
        }

        URI uri;
        try {
            uri = URI.create(baseUrl);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl n'est pas une URL valide.", exception);
        }

        String scheme = trimToNull(uri.getScheme());
        String host = trimToNull(uri.getHost());
        if (scheme == null || host == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "baseUrl doit etre une URL absolue.");
        }

        String normalizedHost = host.toLowerCase(Locale.ROOT);
        switch (provider) {
            case SUPABASE -> {
                if (!normalizedHost.endsWith(".supabase.co")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service SUPABASE doit utiliser une Project URL Supabase valide.");
                }
            }
            case GROQ -> {
                if (!"api.groq.com".equals(normalizedHost)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service GROQ doit utiliser https://api.groq.com ou https://api.groq.com/openai/v1.");
                }
            }
            case SHOTSTACK -> {
                if (!"api.shotstack.io".equals(normalizedHost)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service SHOTSTACK doit utiliser https://api.shotstack.io, /v1, /stage, /edit/v1 ou /edit/stage.");
                }
            }
            case PEXELS -> {
                if (!"api.pexels.com".equals(normalizedHost)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service PEXELS doit utiliser https://api.pexels.com.");
                }
            }
            case N8N -> {
                // n8n can legitimately point to self-hosted or cloud instances.
            }
        }
    }

    private ServiceConnection resolveConnectionForUpsert(ServiceConnectionProvider provider, Long connectionId) {
        if (connectionId == null || connectionId <= 0) {
            return serviceConnectionRepository.findFirstByProviderKeyAndActiveTrue(provider)
                    .orElseGet(() -> {
                        ServiceConnection next = new ServiceConnection();
                        next.setProviderKey(provider);
                        return next;
                    });
        }

        ServiceConnection connection = serviceConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service connection introuvable."));
        if (connection.getProviderKey() != provider) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le profil ne correspond pas au provider demande.");
        }
        return connection;
    }

    private void deactivateOtherConnections(ServiceConnectionProvider provider, Long activeConnectionId) {
        serviceConnectionRepository.findAllByProviderKeyOrderByActiveDescIdDesc(provider)
                .stream()
                .filter(connection -> !Objects.equals(connection.getId(), activeConnectionId))
                .filter(ServiceConnection::isActive)
                .forEach(connection -> {
                    connection.setActive(false);
                    serviceConnectionRepository.save(connection);
                });
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized.length() > 500 ? normalized.substring(0, 500) : normalized;
    }
}

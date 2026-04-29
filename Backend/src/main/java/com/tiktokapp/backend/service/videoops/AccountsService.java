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
import com.tiktokapp.backend.repository.ServiceConnectionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
public class AccountsService {

    private final ServiceConnectionRepository serviceConnectionRepository;
    private final SupabaseVideoOpsGateway supabaseGateway;
    private final VideoOpsCryptoService cryptoService;
    private final VideoOpsService videoOpsService;

    public AccountsService(
            ServiceConnectionRepository serviceConnectionRepository,
            SupabaseVideoOpsGateway supabaseGateway,
            VideoOpsCryptoService cryptoService,
            VideoOpsService videoOpsService
    ) {
        this.serviceConnectionRepository = serviceConnectionRepository;
        this.supabaseGateway = supabaseGateway;
        this.cryptoService = cryptoService;
        this.videoOpsService = videoOpsService;
    }

    @Transactional(readOnly = true)
    public AccountsOverviewResponse fetchOverview() {
        List<TikTokAccountResponse> tiktokAccounts = videoOpsService.fetchTikTokAccounts();
        List<ServiceConnectionResponse> serviceConnections = serviceConnectionRepository.findAllByOrderByProviderKeyAsc().stream()
                .map(this::toResponse)
                .toList();
        return new AccountsOverviewResponse(
                tiktokAccounts,
                serviceConnections,
                buildReadiness(tiktokAccounts, serviceConnections)
        );
    }

    @Transactional(readOnly = true)
    public AccountsReadinessResponse fetchReadiness() {
        List<TikTokAccountResponse> tiktokAccounts = videoOpsService.fetchTikTokAccounts();
        List<ServiceConnectionResponse> serviceConnections = serviceConnectionRepository.findAllByOrderByProviderKeyAsc().stream()
                .map(this::toResponse)
                .toList();
        return buildReadiness(tiktokAccounts, serviceConnections);
    }

    @Transactional
    public ServiceConnectionResponse upsertServiceConnection(String providerKey, ServiceConnectionRequest request) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        ServiceConnection connection = serviceConnectionRepository.findByProviderKey(provider)
                .orElseGet(() -> {
                    ServiceConnection next = new ServiceConnection();
                    next.setProviderKey(provider);
                    return next;
                });

        connection.setDisplayName(trimToNull(request.getDisplayName()));
        connection.setBaseUrl(trimToNull(request.getBaseUrl()));
        connection.setAccountIdentifier(trimToNull(request.getAccountIdentifier()));
        connection.setMetadataJson(trimToNull(request.getMetadataJson()));
        if (trimToNull(request.getSecretValue()) != null) {
            connection.setSecretValue(cryptoService.encryptIfConfigured(request.getSecretValue().trim()));
        }
        connection.setStatus(ServiceConnectionStatus.CONNECTED);
        if (connection.getConnectedAt() == null) {
            connection.setConnectedAt(Instant.now());
        }
        connection.setLastValidatedAt(Instant.now());
        serviceConnectionRepository.save(connection);
        return toResponse(connection);
    }

    @Transactional
    public void disconnectServiceConnection(String providerKey) {
        ServiceConnectionProvider provider = parseProvider(providerKey);
        ServiceConnection connection = serviceConnectionRepository.findByProviderKey(provider)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service connection introuvable."));
        connection.setStatus(ServiceConnectionStatus.DISCONNECTED);
        connection.setSecretValue(null);
        connection.setLastValidatedAt(null);
        serviceConnectionRepository.save(connection);
    }

    @Transactional
    public void disconnectTikTokAccount(long accountId) {
        supabaseGateway.deleteTikTokAccount(accountId);
    }

    private AccountsReadinessResponse buildReadiness(
            List<TikTokAccountResponse> tiktokAccounts,
            List<ServiceConnectionResponse> serviceConnections
    ) {
        List<String> missingItems = new ArrayList<>();
        if (tiktokAccounts == null || tiktokAccounts.isEmpty()) {
            missingItems.add("TikTok");
        }

        for (ServiceConnectionProvider provider : Arrays.asList(
                ServiceConnectionProvider.SUPABASE,
                ServiceConnectionProvider.N8N,
                ServiceConnectionProvider.GROQ,
                ServiceConnectionProvider.SHOTSTACK,
                ServiceConnectionProvider.PEXELS
        )) {
            boolean connected = serviceConnections.stream().anyMatch(connection ->
                    provider.name().equalsIgnoreCase(connection.getProviderKey())
                            && "CONNECTED".equalsIgnoreCase(connection.getStatus())
                            && connection.isHasSecret()
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
                trimToNull(connection.getSecretValue()) != null,
                connection.getStatus() == null ? ServiceConnectionStatus.DISCONNECTED.name() : connection.getStatus().name(),
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

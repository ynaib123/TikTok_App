package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.model.ServiceConnection;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import com.tiktokapp.backend.model.ServiceConnectionStatus;
import com.tiktokapp.backend.repository.ServiceConnectionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ServiceConnectionResolver {

    private final ServiceConnectionRepository repository;
    private final VideoOpsCryptoService cryptoService;
    private final ObjectMapper objectMapper;

    public ServiceConnectionResolver(
            ServiceConnectionRepository repository,
            VideoOpsCryptoService cryptoService,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.cryptoService = cryptoService;
        this.objectMapper = objectMapper;
    }

    public ResolvedServiceConnection requireConnected(ServiceConnectionProvider provider) {
        ServiceConnection connection = repository.findFirstByProviderKeyAndActiveTrue(provider)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service " + provider.name() + " n'est pas configure dans Accounts."));

        if (connection.getStatus() != ServiceConnectionStatus.CONNECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le service " + provider.name() + " n'est pas connecte dans Accounts.");
        }

        String secretValue = cryptoService.decryptIfNeeded(trimToNull(connection.getSecretValue()));
        if (secretValue == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le secret du service " + provider.name() + " est manquant dans Accounts.");
        }

        return new ResolvedServiceConnection(
                trimToNull(connection.getBaseUrl()),
                secretValue,
                trimToNull(connection.getAccountIdentifier()),
                trimToNull(connection.getDisplayName()),
                parseMetadata(connection.getMetadataJson(), provider)
        );
    }

    public ResolvedServiceConnection findConnected(ServiceConnectionProvider provider) {
        return repository.findFirstByProviderKeyAndActiveTrue(provider)
                .filter(connection -> connection.getStatus() == ServiceConnectionStatus.CONNECTED)
                .map(connection -> new ResolvedServiceConnection(
                        trimToNull(connection.getBaseUrl()),
                        cryptoService.decryptIfNeeded(trimToNull(connection.getSecretValue())),
                        trimToNull(connection.getAccountIdentifier()),
                        trimToNull(connection.getDisplayName()),
                        parseMetadata(connection.getMetadataJson(), provider)
                ))
                .orElse(null);
    }

    private JsonNode parseMetadata(String rawMetadata, ServiceConnectionProvider provider) {
        String normalized = trimToNull(rawMetadata);
        if (normalized == null) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(normalized);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le metadataJson du service " + provider.name() + " n'est pas un JSON valide.", exception);
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

package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.videoops.ServiceConnectionRequest;
import com.tiktokapp.backend.repository.ServiceConnectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccountsServiceTest {

    @Mock
    private ServiceConnectionRepository serviceConnectionRepository;

    @Mock
    private ContentIdeaGateway contentIdeaGateway;

    @Mock
    private VideoOpsCryptoService cryptoService;

    @Mock
    private VideoOpsService videoOpsService;

    @Mock
    private ServiceConnectionGatewayService gatewayService;

    private AccountsService accountsService;

    @BeforeEach
    void setUp() {
        accountsService = new AccountsService(
                serviceConnectionRepository,
                contentIdeaGateway,
                cryptoService,
                videoOpsService,
                gatewayService,
                new ServiceQuotaProbe()
        );
    }

    @Test
    void rejectsNonSupabaseUrlForSupabaseProvider() {
        ServiceConnectionRequest request = new ServiceConnectionRequest();
        request.setBaseUrl("https://api.groq.com");
        request.setSecretValue("secret");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> accountsService.upsertServiceConnection("SUPABASE", request)
        );

        assertEquals(400, exception.getStatusCode().value());
        assertEquals("Le service SUPABASE doit utiliser une Project URL Supabase valide.", exception.getReason());
        verify(serviceConnectionRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}

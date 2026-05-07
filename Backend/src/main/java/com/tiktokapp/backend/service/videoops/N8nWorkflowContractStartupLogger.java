package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.dto.videoops.N8nWorkflowContractResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@Profile("!dev")
public class N8nWorkflowContractStartupLogger {

    private static final Logger logger = LoggerFactory.getLogger(N8nWorkflowContractStartupLogger.class);

    private final N8nWorkflowContractService contractService;

    public N8nWorkflowContractStartupLogger(N8nWorkflowContractService contractService) {
        this.contractService = contractService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logResolvedContract() {
        try {
            N8nWorkflowContractResponse contract = contractService.describeContract();
            logger.info(
                    "video_ops n8n_contract healthy={} source={} baseUrl={} stuckRunCount={} warnings={}",
                    contract.isHealthy(),
                    contract.getSource(),
                    contract.getBaseUrl(),
                    contract.getStuckRunCount(),
                    contract.getWarnings()
            );
        } catch (Exception exception) {
            logger.warn("video_ops could not resolve n8n contract at startup", exception);
        }
    }
}

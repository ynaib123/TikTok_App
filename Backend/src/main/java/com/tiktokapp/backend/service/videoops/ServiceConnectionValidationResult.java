package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.model.ServiceConnectionValidationStatus;

public record ServiceConnectionValidationResult(
        ServiceConnectionValidationStatus status,
        String message
) {
}

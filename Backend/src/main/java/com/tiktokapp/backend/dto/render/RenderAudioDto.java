package com.tiktokapp.backend.dto.render;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record RenderAudioDto(
        @NotBlank @URL String url,
        String provider,
        String voiceId,
        @DecimalMin("0") @DecimalMax("200") double volume
) {}

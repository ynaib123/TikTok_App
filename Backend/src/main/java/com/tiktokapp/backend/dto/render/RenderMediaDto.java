package com.tiktokapp.backend.dto.render;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record RenderMediaDto(
        @NotBlank @URL String url,
        String provider,
        String license,
        Integer width,
        Integer height,
        Double durationSec,
        Double qualityScore
) {}

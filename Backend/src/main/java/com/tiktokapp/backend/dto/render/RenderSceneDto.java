package com.tiktokapp.backend.dto.render;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RenderSceneDto(
        @Min(0) int index,
        @DecimalMin("0.5") @DecimalMax("30") double durationSec,
        @Size(max = 240) String text,
        @Size(max = 60) String emotion,
        @Size(max = 240) String mediaQuery,
        @Size(max = 80) String cameraMood,
        @Size(max = 40) String overlayPriority,
        @Valid RenderTextStyleDto textStyle,
        @NotNull @Valid RenderMediaDto media
) {}

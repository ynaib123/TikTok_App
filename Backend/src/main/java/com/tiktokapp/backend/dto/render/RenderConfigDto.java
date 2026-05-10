package com.tiktokapp.backend.dto.render;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RenderConfigDto(
        @NotBlank String templateId,
        @Pattern(regexp = "9:16") String aspectRatio,
        int width,
        int height,
        int fps,
        @DecimalMin("5") @DecimalMax("120") double durationSec,
        @Pattern(regexp = "draft|standard|high|premium") String qualityProfile,
        @Pattern(regexp = "none|line|karaoke|word") String captionMode,
        @Pattern(regexp = "single-background|timed-scenes|mixed-media") String sceneStrategy
) {}

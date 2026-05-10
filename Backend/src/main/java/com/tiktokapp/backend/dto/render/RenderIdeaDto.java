package com.tiktokapp.backend.dto.render;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenderIdeaDto(
        @Size(max = 120) String category,
        @NotBlank @Size(max = 240) String topic,
        @Size(max = 140) String hook,
        @NotBlank @Size(max = 4000) String script,
        @NotBlank @Size(max = 2200) String caption,
        @NotBlank @Size(max = 240) String keyword,
        String language,
        @Size(max = 140) String cta,
        @Size(max = 240) String visualStyle
) {}

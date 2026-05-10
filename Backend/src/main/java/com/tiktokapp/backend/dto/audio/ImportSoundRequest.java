package com.tiktokapp.backend.dto.audio;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ImportSoundRequest(
        @NotBlank @Size(max = 1024) String videoUrl
) {}

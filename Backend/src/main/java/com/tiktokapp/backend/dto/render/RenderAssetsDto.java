package com.tiktokapp.backend.dto.render;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RenderAssetsDto(
        @NotNull @Valid RenderMediaDto backgroundVideo,
        @Valid RenderAudioDto voiceover,
        @Valid RenderAudioDto music,
        @Valid @Size(min = 1, max = 12) List<RenderSceneDto> scenes
) {}

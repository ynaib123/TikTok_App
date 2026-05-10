package com.tiktokapp.backend.dto.render;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Représentation typée du contrat render-video-job.schema.json v1.1.0.
 * Utiliser {@link RenderJobPayloadHasher} pour calculer le hash de payload
 * utilisé dans l'idempotence des workflow runs.
 */
public record RenderVideoJobDto(
        @Pattern(regexp = "1\\.0\\.0|1\\.1\\.0") String contractVersion,
        @Min(1) long workflowRunId,
        @Min(1) long contentIdeaId,
        @NotBlank @Size(max = 120) String source,
        @NotBlank String requestedAt,
        @NotNull @Valid RenderIdeaDto idea,
        @NotNull @Valid RenderConfigDto render,
        @NotNull @Valid RenderAssetsDto assets
) {}

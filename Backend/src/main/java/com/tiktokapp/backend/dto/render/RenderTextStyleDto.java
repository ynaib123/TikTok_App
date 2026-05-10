package com.tiktokapp.backend.dto.render;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RenderTextStyleDto(
        @DecimalMin("0") @DecimalMax("100") double textX,
        @DecimalMin("0") @DecimalMax("100") double textY,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String textColor,
        @Size(max = 80) String fontFamily,
        @DecimalMin("10") @DecimalMax("120") double fontSize,
        @Min(100) @Max(1000) int fontWeight,
        boolean uppercase,
        @Pattern(regexp = "none|soft|strong") String shadow
) {}

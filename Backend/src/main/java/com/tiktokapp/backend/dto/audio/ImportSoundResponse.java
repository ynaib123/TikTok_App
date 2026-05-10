package com.tiktokapp.backend.dto.audio;

public record ImportSoundResponse(
        TikTokSoundResponse sound,
        boolean alreadyExisted
) {}

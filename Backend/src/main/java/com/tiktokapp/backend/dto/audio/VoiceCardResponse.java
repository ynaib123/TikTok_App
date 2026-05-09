package com.tiktokapp.backend.dto.audio;

/**
 * Lightweight projection of an ElevenLabs voice for the AudioStep voice library
 * cards (avatar / flag / name / quick metadata).
 */
public record VoiceCardResponse(
        String voiceId,
        String name,
        String language,
        String gender,
        String accent,
        String previewUrl,
        String description
) {}

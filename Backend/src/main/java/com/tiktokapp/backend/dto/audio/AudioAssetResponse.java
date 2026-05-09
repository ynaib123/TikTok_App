package com.tiktokapp.backend.dto.audio;

import com.tiktokapp.backend.model.AudioAsset;

public record AudioAssetResponse(
        Long id,
        Long contentIdeaId,
        String assetKind,
        String voiceId,
        String voiceName,
        String voiceLanguage,
        String storageUrl,
        Integer durationMs,
        Integer voiceVolume,
        Integer musicVolume,
        boolean selected,
        String createdAt
) {
    public static AudioAssetResponse from(AudioAsset asset) {
        return new AudioAssetResponse(
                asset.getId(),
                asset.getContentIdeaId(),
                asset.getAssetKind() == null ? null : asset.getAssetKind().name(),
                asset.getVoiceId(),
                asset.getVoiceName(),
                asset.getVoiceLanguage(),
                asset.getStorageUrl(),
                asset.getDurationMs(),
                asset.getVoiceVolume(),
                asset.getMusicVolume(),
                asset.isSelected(),
                asset.getCreatedAt() == null ? null : asset.getCreatedAt().toString()
        );
    }
}

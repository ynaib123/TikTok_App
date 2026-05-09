package com.tiktokapp.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Audio takes attached to a content idea : ElevenLabs voice-overs, uploaded
 * background music or full mixes. See V11 migration for the schema contract.
 */
@Entity
@Table(name = "audio_assets")
public class AudioAsset {

    public enum AssetKind { voice, music, mix }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_idea_id")
    private Long contentIdeaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_kind", nullable = false, length = 32)
    private AssetKind assetKind;

    @Column(name = "voice_id", length = 128)
    private String voiceId;

    @Column(name = "voice_name", length = 128)
    private String voiceName;

    @Column(name = "voice_language", length = 16)
    private String voiceLanguage;

    @Column(name = "storage_url", nullable = false, columnDefinition = "TEXT")
    private String storageUrl;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "voice_volume", nullable = false)
    private Integer voiceVolume = 100;

    @Column(name = "music_volume", nullable = false)
    private Integer musicVolume = 30;

    @Column(name = "elevenlabs_request", columnDefinition = "TEXT")
    private String elevenlabsRequest;

    @Column(name = "created_by_email", length = 255)
    private String createdByEmail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "is_selected", nullable = false)
    private boolean selected = false;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (voiceVolume == null) voiceVolume = 100;
        if (musicVolume == null) musicVolume = 30;
    }

    public Long getId() { return id; }
    public Long getContentIdeaId() { return contentIdeaId; }
    public void setContentIdeaId(Long contentIdeaId) { this.contentIdeaId = contentIdeaId; }
    public AssetKind getAssetKind() { return assetKind; }
    public void setAssetKind(AssetKind assetKind) { this.assetKind = assetKind; }
    public String getVoiceId() { return voiceId; }
    public void setVoiceId(String voiceId) { this.voiceId = voiceId; }
    public String getVoiceName() { return voiceName; }
    public void setVoiceName(String voiceName) { this.voiceName = voiceName; }
    public String getVoiceLanguage() { return voiceLanguage; }
    public void setVoiceLanguage(String voiceLanguage) { this.voiceLanguage = voiceLanguage; }
    public String getStorageUrl() { return storageUrl; }
    public void setStorageUrl(String storageUrl) { this.storageUrl = storageUrl; }
    public Integer getDurationMs() { return durationMs; }
    public void setDurationMs(Integer durationMs) { this.durationMs = durationMs; }
    public Integer getVoiceVolume() { return voiceVolume; }
    public void setVoiceVolume(Integer voiceVolume) { this.voiceVolume = voiceVolume; }
    public Integer getMusicVolume() { return musicVolume; }
    public void setMusicVolume(Integer musicVolume) { this.musicVolume = musicVolume; }
    public String getElevenlabsRequest() { return elevenlabsRequest; }
    public void setElevenlabsRequest(String elevenlabsRequest) { this.elevenlabsRequest = elevenlabsRequest; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isSelected() { return selected; }
    public void setSelected(boolean selected) { this.selected = selected; }
}

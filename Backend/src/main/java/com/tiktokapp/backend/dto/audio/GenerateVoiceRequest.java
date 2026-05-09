package com.tiktokapp.backend.dto.audio;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class GenerateVoiceRequest {

    @NotNull
    private Long contentIdeaId;

    @NotBlank
    @Size(max = 128)
    private String voiceId;

    @NotBlank
    @Size(min = 1, max = 8_000)
    private String text;

    @Size(max = 64)
    private String modelId;

    /** Voice volume in percent (0–200). 100 = no change. */
    @Min(0)
    private Integer voiceVolume;

    /** Music volume in percent (0–200). 100 = no change. */
    @Min(0)
    private Integer musicVolume;

    public Long getContentIdeaId() { return contentIdeaId; }
    public void setContentIdeaId(Long contentIdeaId) { this.contentIdeaId = contentIdeaId; }
    public String getVoiceId() { return voiceId; }
    public void setVoiceId(String voiceId) { this.voiceId = voiceId; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getModelId() { return modelId; }
    public void setModelId(String modelId) { this.modelId = modelId; }
    public Integer getVoiceVolume() { return voiceVolume; }
    public void setVoiceVolume(Integer voiceVolume) { this.voiceVolume = voiceVolume; }
    public Integer getMusicVolume() { return musicVolume; }
    public void setMusicVolume(Integer musicVolume) { this.musicVolume = musicVolume; }
}

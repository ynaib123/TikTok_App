package com.tiktokapp.backend.dto.videoops;

public class VideoStatCardResponse {

    private final String label;
    private final String value;
    private final String tone;

    public VideoStatCardResponse(String label, String value, String tone) {
        this.label = label;
        this.value = value;
        this.tone = tone;
    }

    public String getLabel() {
        return label;
    }

    public String getValue() {
        return value;
    }

    public String getTone() {
        return tone;
    }
}

package com.tiktokapp.backend.dto.videoops;

public class VideoStatusGroupResponse {

    private final String label;
    private final int value;

    public VideoStatusGroupResponse(String label, int value) {
        this.label = label;
        this.value = value;
    }

    public String getLabel() {
        return label;
    }

    public int getValue() {
        return value;
    }
}

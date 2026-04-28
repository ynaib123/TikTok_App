package com.tiktokapp.backend.model;

public enum VideoPipelineStage {
    UNKNOWN,
    CREATION_REQUESTED,
    RENDERING_REQUESTED,
    RENDER_READY,
    PUBLISH_INITIALIZED,
    UPLOAD_COMPLETED,
    PUBLISHED,
    FAILED
}

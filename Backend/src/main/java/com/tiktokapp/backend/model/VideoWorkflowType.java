package com.tiktokapp.backend.model;

public enum VideoWorkflowType {
    MAIN_PIPELINE,
    SCRIPT_GENERATION,
    CHECK_SHOTSTACK,
    RENDER_TEMPLATE_VIDEO,
    INIT_PUBLISH_TIKTOK,
    TIKTOK_UPLOAD,
    FINALIZE_PUBLISH
}

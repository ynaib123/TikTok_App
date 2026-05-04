package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.model.VideoPipelineStage;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;

import java.util.List;
import java.util.Locale;

/**
 * Central source of truth for pipeline stage transitions.
 * <p>
 * The pipeline intentionally tracks a coarse product-level state instead of mirroring every
 * vendor-specific field. External systems such as Shotstack, TikTok and n8n can expose many
 * low-level statuses, but the backoffice only needs stable milestones:
 * creation -> script -> render -> upload prepare -> upload -> publish.
 */
public final class VideoOpsStateMachine {

    private VideoOpsStateMachine() {
    }

    public static VideoPipelineStage requestedStage(VideoWorkflowType workflowType) {
        return switch (workflowType) {
            case MAIN_PIPELINE -> VideoPipelineStage.CREATION_REQUESTED;
            case SCRIPT_GENERATION -> VideoPipelineStage.SCRIPT_REQUESTED;
            case CHECK_SHOTSTACK -> VideoPipelineStage.RENDERING_REQUESTED;
            case RENDER_TEMPLATE_VIDEO -> VideoPipelineStage.RENDERING_REQUESTED;
            case INIT_PUBLISH_TIKTOK -> VideoPipelineStage.UPLOAD_PREPARING;
            case TIKTOK_UPLOAD -> VideoPipelineStage.PUBLISH_INITIALIZED;
            case FINALIZE_PUBLISH -> VideoPipelineStage.PUBLISHED;
        };
    }

    public static VideoPipelineStage successStage(VideoWorkflowType workflowType, VideoPipelineStage currentStage) {
        return switch (workflowType) {
            // Fused workflow produces idea + script in one run, so success means SCRIPT_READY.
            case MAIN_PIPELINE -> VideoPipelineStage.SCRIPT_READY;
            case SCRIPT_GENERATION -> VideoPipelineStage.SCRIPT_READY;
            case CHECK_SHOTSTACK -> VideoPipelineStage.RENDER_READY;
            case RENDER_TEMPLATE_VIDEO -> currentStage == VideoPipelineStage.RENDER_READY
                    ? VideoPipelineStage.RENDER_READY
                    : VideoPipelineStage.RENDERING_REQUESTED;
            case INIT_PUBLISH_TIKTOK -> VideoPipelineStage.PUBLISH_INITIALIZED;
            case TIKTOK_UPLOAD -> VideoPipelineStage.UPLOAD_COMPLETED;
            case FINALIZE_PUBLISH -> VideoPipelineStage.PUBLISHED;
        };
    }

    public static VideoPipelineStage failureStage() {
        return VideoPipelineStage.FAILED;
    }

    public static VideoPipelineStage resolveFromContentSignals(
            String shotstackStatus,
            String tiktokStatus,
            String finalVideoStatus,
            String shotstackUrl,
            String uploadUrl,
            VideoPipelineStage fallback
    ) {
        String normalizedTikTokStatus = lower(tiktokStatus);
        String normalizedShotstackStatus = lower(shotstackStatus);
        String normalizedFinalVideoStatus = lower(finalVideoStatus);

        if ("published".equals(normalizedTikTokStatus)) {
            return VideoPipelineStage.PUBLISHED;
        }
        if (List.of("uploaded", "uploading").contains(normalizedTikTokStatus)) {
            return VideoPipelineStage.UPLOAD_COMPLETED;
        }
        if (!isBlank(uploadUrl)) {
            return VideoPipelineStage.PUBLISH_INITIALIZED;
        }
        if ("ready".equals(normalizedFinalVideoStatus) || "done".equals(normalizedShotstackStatus) || !isBlank(shotstackUrl)) {
            return VideoPipelineStage.RENDER_READY;
        }
        if (List.of("queued", "rendering", "preprocessing", "preparing").contains(normalizedShotstackStatus)) {
            return VideoPipelineStage.RENDERING_REQUESTED;
        }
        return fallback == null ? VideoPipelineStage.UNKNOWN : fallback;
    }

    public static boolean canTransition(VideoPipelineStage currentStage, VideoPipelineStage nextStage) {
        if (nextStage == null || currentStage == null || currentStage == nextStage) {
            return true;
        }
        if (nextStage == VideoPipelineStage.FAILED) {
            return true;
        }
        return indexOf(nextStage) >= indexOf(currentStage);
    }

    public static String describe(VideoPipelineStage stage) {
        return switch (stage) {
            case UNKNOWN -> "Pipeline inconnu";
            case CREATION_REQUESTED -> "Generation d idee demandee";
            case IDEA_CREATED -> "Idee creee";
            case SCRIPT_REQUESTED -> "Generation du script demandee";
            case SCRIPT_READY -> "Script pret";
            case RENDERING_REQUESTED -> "Rendu video demande";
            case RENDER_READY -> "Video rendue";
            case UPLOAD_PREPARING -> "Preparation de l upload TikTok";
            case PUBLISH_INITIALIZED -> "URL d upload TikTok generee";
            case UPLOAD_COMPLETED -> "Media envoye vers TikTok";
            case PUBLISHED -> "Publication marquee comme complete";
            case FAILED -> "Pipeline en echec";
        };
    }

    public static VideoPipelineStage stageForRunStatus(VideoWorkflowType workflowType, VideoWorkflowRunStatus runStatus, VideoPipelineStage currentStage) {
        if (runStatus == null || workflowType == null) {
            return currentStage == null ? VideoPipelineStage.UNKNOWN : currentStage;
        }
        return runStatus == VideoWorkflowRunStatus.FAILED
                ? failureStage()
                : successStage(workflowType, currentStage);
    }

    private static int indexOf(VideoPipelineStage stage) {
        return switch (stage) {
            case UNKNOWN -> 0;
            case CREATION_REQUESTED -> 1;
            case IDEA_CREATED -> 2;
            case SCRIPT_REQUESTED -> 3;
            case SCRIPT_READY -> 4;
            case RENDERING_REQUESTED -> 5;
            case RENDER_READY -> 6;
            case UPLOAD_PREPARING -> 7;
            case PUBLISH_INITIALIZED -> 8;
            case UPLOAD_COMPLETED -> 9;
            case PUBLISHED -> 10;
            case FAILED -> 11;
        };
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

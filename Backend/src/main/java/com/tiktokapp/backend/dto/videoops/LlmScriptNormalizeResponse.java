package com.tiktokapp.backend.dto.videoops;

import java.util.List;

public record LlmScriptNormalizeResponse(
        String script,
        String caption,
        String hook,
        String backgroundKeyword,
        List<NormalizedScene> scenes,
        QualityReview qualityReview,
        int sceneCount,
        long contentIdeaId,
        long workflowRunId
) {
    public record NormalizedScene(
            String sceneText,
            String visualKeyword,
            String cameraMood,
            String overlayPriority
    ) {}

    public record QualityReview(
            int score,
            List<String> issues,
            Boolean languageOk,
            Boolean sceneCountOk,
            Boolean repaired,
            String repairReason
    ) {}
}

package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

public final class WorkflowCompletionStatusMapper {

    private WorkflowCompletionStatusMapper() {
    }

    public static VideoWorkflowRunStatus toRunStatus(String rawStatus) {
        String normalizedStatus = trimToNull(rawStatus);
        if (normalizedStatus == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status workflow invalide.");
        }

        String canonical = normalizedStatus
                .trim()
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);

        return switch (canonical) {
            case "SUCCEEDED", "SUCCESS", "COMPLETED", "COMPLETE", "DONE", "OK",
                    "SCRIPT_READY", "RENDERING_REQUESTED", "RENDER_READY", "INIT_DONE" -> VideoWorkflowRunStatus.SUCCEEDED;
            case "FAILED", "FAIL", "ERROR" -> VideoWorkflowRunStatus.FAILED;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status workflow doit etre SUCCEEDED ou FAILED.");
        };
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}

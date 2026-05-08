package com.tiktokapp.backend.web;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import com.tiktokapp.backend.service.videoops.MultiSceneJobBuilderService;
import com.tiktokapp.backend.service.videoops.VideoOpsInternalAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Endpoint internal pour construire un RenderVideoJob multi-scènes (contrat 1.1.0)
 * à partir d'une content idea existante. Utilisable par n8n pour remplacer la
 * logique mono-fond actuelle.
 */
@RestController
@RequestMapping("/api/video-ops/internal/scenes")
public class ScenesController {

    private static final Logger logger = LoggerFactory.getLogger(ScenesController.class);

    private final MultiSceneJobBuilderService jobBuilder;
    private final ContentIdeaRepository contentIdeaRepository;
    private final VideoOpsInternalAuthService internalAuthService;

    public ScenesController(
            MultiSceneJobBuilderService jobBuilder,
            ContentIdeaRepository contentIdeaRepository,
            VideoOpsInternalAuthService internalAuthService
    ) {
        this.jobBuilder = jobBuilder;
        this.contentIdeaRepository = contentIdeaRepository;
        this.internalAuthService = internalAuthService;
    }

    public record ScenesBuildRequest(
            Long workflowRunId,
            String source,
            String templateId,
            Integer width,
            Integer height,
            Integer fps,
            Double durationSec,
            String qualityProfile,
            String captionMode,
            String hook,
            String cta
    ) {}

    @PostMapping("/build/{contentIdeaId}")
    public ResponseEntity<ObjectNode> build(
            @PathVariable long contentIdeaId,
            @RequestBody(required = false) ScenesBuildRequest request,
            @RequestHeader(name = VideoOpsInternalAuthService.HEADER_NAME, required = false) String internalSecret
    ) {
        internalAuthService.validateSecret(internalSecret);

        ContentIdea idea = contentIdeaRepository.findById(contentIdeaId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ContentIdea introuvable: " + contentIdeaId)
        );

        MultiSceneJobBuilderService.BuildOptions options = resolveOptions(request);
        try {
            MultiSceneJobBuilderService.BuildResult result = jobBuilder.build(idea, options);
            logger.info(
                    "scenes/build contentIdeaId={} scenes={} durationSec={}",
                    contentIdeaId,
                    result.sceneSpecs().size(),
                    options.durationSec()
            );
            return ResponseEntity.ok(result.renderJob());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), ex);
        }
    }

    private MultiSceneJobBuilderService.BuildOptions resolveOptions(ScenesBuildRequest request) {
        MultiSceneJobBuilderService.BuildOptions defaults = MultiSceneJobBuilderService.BuildOptions
                .defaults(0L, "scenes-build-endpoint");
        if (request == null) {
            return defaults;
        }
        return new MultiSceneJobBuilderService.BuildOptions(
                request.workflowRunId() == null ? defaults.workflowRunId() : request.workflowRunId(),
                request.source() == null || request.source().isBlank() ? defaults.source() : request.source(),
                request.templateId() == null || request.templateId().isBlank() ? defaults.templateId() : request.templateId(),
                request.width() == null ? defaults.width() : request.width(),
                request.height() == null ? defaults.height() : request.height(),
                request.fps() == null ? defaults.fps() : request.fps(),
                request.durationSec() == null ? defaults.durationSec() : request.durationSec(),
                request.qualityProfile() == null || request.qualityProfile().isBlank()
                        ? defaults.qualityProfile() : request.qualityProfile(),
                request.captionMode() == null || request.captionMode().isBlank()
                        ? defaults.captionMode() : request.captionMode(),
                request.hook(),
                request.cta()
        );
    }
}
